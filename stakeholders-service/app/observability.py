import logging
import json
import time
from datetime import datetime
from typing import Optional
from contextlib import contextmanager

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.sdk.resources import Resource

from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse
import os


class ObservabilityManager:
    def __init__(self, service_name: str = "stakeholders-service"):
        self.service_name = service_name
        self.setup_logging()
        self.setup_tracing()
        self.setup_metrics()
        
    def setup_logging(self):
        """Konfiguracija strukturnog logovanja"""
        # Kreiranje logs direktorijuma ako ne postoji
        os.makedirs('/app/logs', exist_ok=True)
        
        # Custom formatter za JSON logove
        class JSONFormatter(logging.Formatter):
            def format(self, record):
                # Dobijanje trace i span ID-a iz trenutnog span-a
                current_span = trace.get_current_span()
                trace_id = span_id = None
                
                if current_span and current_span.get_span_context().is_valid:
                    trace_id = format(current_span.get_span_context().trace_id, '032x')
                    span_id = format(current_span.get_span_context().span_id, '016x')
                
                log_entry = {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "level": record.levelname,
                    "service": "stakeholders-service",
                    "message": record.getMessage(),
                    "module": record.module,
                    "function": record.funcName,
                    "line": record.lineno,
                }
                
                # Dodavanje trace informacija ako su dostupne
                if trace_id:
                    log_entry["trace_id"] = trace_id
                if span_id:
                    log_entry["span_id"] = span_id
                    
                # Dodavanje dodatnih podataka ako postoje
                if hasattr(record, 'extra_data'):
                    log_entry.update(record.extra_data)
                    
                return json.dumps(log_entry)
        
        # Logger setup
        self.logger = logging.getLogger(self.service_name)
        self.logger.setLevel(logging.INFO)
        
        # File handler za JSON logove
        file_handler = logging.FileHandler('/app/logs/stakeholders.log')
        file_handler.setFormatter(JSONFormatter())
        
        # Console handler za development
        console_handler = logging.StreamHandler()
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
        
    def setup_tracing(self):
        """Konfiguracija OpenTelemetry tracing-a"""
        resource = Resource.create({"service.name": self.service_name})
        
        trace.set_tracer_provider(TracerProvider(resource=resource))
        self.tracer = trace.get_tracer(__name__)
        
        # OTLP exporter za Jaeger
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        
        otlp_exporter = OTLPSpanExporter(
            endpoint="http://jaeger:4317",
            insecure=True
        )
        
        span_processor = BatchSpanProcessor(otlp_exporter)
        trace.get_tracer_provider().add_span_processor(span_processor)
        
    def setup_metrics(self):
        """Konfiguracija Prometheus metrika"""
        # HTTP metrike
        self.http_requests_total = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status_code']
        )
        
        self.http_request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint']
        )
        
        # Database metrike
        self.db_queries_total = Counter(
            'database_queries_total',
            'Total database queries',
            ['operation', 'table']
        )
        
        self.db_query_duration = Histogram(
            'database_query_duration_seconds',
            'Database query duration in seconds',
            ['operation', 'table']
        )
        
        # Application metrike
        self.active_users = Gauge(
            'active_users_total',
            'Number of active users'
        )
        
        self.user_registrations = Counter(
            'user_registrations_total',
            'Total user registrations'
        )
        
        self.failed_login_attempts = Counter(
            'failed_login_attempts_total',
            'Total failed login attempts'
        )
        
    def instrument_fastapi(self, app: FastAPI):
        """Instrumentacija FastAPI aplikacije"""
        # OpenTelemetry instrumentacija
        FastAPIInstrumentor.instrument_app(app)
        
        # Custom middleware za metrike
        @app.middleware("http")
        async def metrics_middleware(request: Request, call_next):
            start_time = time.time()
            
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Record metrics
            method = request.method
            endpoint = request.url.path
            status_code = str(response.status_code)
            
            self.http_requests_total.labels(
                method=method, 
                endpoint=endpoint, 
                status_code=status_code
            ).inc()
            
            self.http_request_duration.labels(
                method=method, 
                endpoint=endpoint
            ).observe(duration)
            
            # Log request
            self.logger.info(
                f"{method} {endpoint} {status_code} - {duration:.3f}s",
                extra={'extra_data': {
                    'http_method': method,
                    'http_endpoint': endpoint,
                    'http_status_code': status_code,
                    'response_time': duration,
                    'user_agent': request.headers.get('user-agent', 'unknown')
                }}
            )
            
            return response
            
        # Metrics endpoint
        @app.get("/metrics", response_class=PlainTextResponse)
        async def get_metrics():
            return generate_latest()
        
    def instrument_sqlalchemy(self, engine):
        """Instrumentacija SQLAlchemy engine-a"""
        SQLAlchemyInstrumentor().instrument(engine=engine)
        
    @contextmanager
    def trace_operation(self, operation_name: str, **attributes):
        """Context manager za custom tracing"""
        with self.tracer.start_as_current_span(operation_name) as span:
            # Dodavanje atributa
            for key, value in attributes.items():
                span.set_attribute(key, str(value))
            
            start_time = time.time()
            try:
                yield span
            except Exception as e:
                span.set_attribute("error", True)
                span.set_attribute("error.message", str(e))
                self.logger.error(f"Operation {operation_name} failed: {str(e)}")
                raise
            finally:
                duration = time.time() - start_time
                span.set_attribute("duration", duration)
                
    def log_user_action(self, action: str, user_id: Optional[int] = None, **kwargs):
        """Logovanje korisničkih akcija"""
        extra_data = {
            'action': action,
            'user_id': user_id,
            **kwargs
        }
        
        self.logger.info(f"User action: {action}", extra={'extra_data': extra_data})
        
    def log_database_operation(self, operation: str, table: str, duration: float, **kwargs):
        """Logovanje database operacija"""
        self.db_queries_total.labels(operation=operation, table=table).inc()
        self.db_query_duration.labels(operation=operation, table=table).observe(duration)
        
        extra_data = {
            'db_operation': operation,
            'db_table': table,
            'db_duration': duration,
            **kwargs
        }
        
        self.logger.info(f"Database {operation} on {table} - {duration:.3f}s", 
                        extra={'extra_data': extra_data})


# Global instance
observability = ObservabilityManager()

# Convenience functions
def get_logger():
    return observability.logger

def trace_operation(operation_name: str, **attributes):
    return observability.trace_operation(operation_name, **attributes)

def log_user_action(action: str, user_id: Optional[int] = None, **kwargs):
    observability.log_user_action(action, user_id, **kwargs)

def log_database_operation(operation: str, table: str, duration: float, **kwargs):
    observability.log_database_operation(operation, table, duration, **kwargs)