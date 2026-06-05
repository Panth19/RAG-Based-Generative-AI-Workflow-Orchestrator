# Use AWS Lambda Python 3.11 base image for compatibility
FROM public.ecr.aws/lambda/python:3.11

# Set working directory
WORKDIR /var/task

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set the CMD to your Lambda handler
CMD ["app.main.lambda_handler"]
