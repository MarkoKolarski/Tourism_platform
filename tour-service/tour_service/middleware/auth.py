class GatewayAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.user_id = request.headers.get("X-User-Id")
        request.user_role = request.headers.get("X-User-Role")
        request.username = request.headers.get("X-Username")

        return self.get_response(request)
