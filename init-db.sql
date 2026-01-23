CREATE DATABASE tourism_stakeholders;
CREATE DATABASE tourism_purchase;
CREATE DATABASE tourism_blog;

-- Create users if needed (optional)
CREATE USER stakeholders_user WITH PASSWORD 'ftn';
CREATE USER purchase_user WITH PASSWORD 'ftn';
CREATE USER blog_user WITH PASSWORD 'ftn';

-- Grant permissions (optional)
GRANT ALL PRIVILEGES ON DATABASE tourism_stakeholders TO stakeholders_user;
GRANT ALL PRIVILEGES ON DATABASE tourism_purchase TO purchase_user;
GRANT ALL PRIVILEGES ON DATABASE tourism_blog TO blog_user;
