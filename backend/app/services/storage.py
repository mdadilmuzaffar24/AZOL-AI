import boto3
from botocore.exceptions import ClientError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_s3_client():
    """Initializes the connection to our local MinIO data lake."""
    return boto3.client(
        's3',
        endpoint_url=settings.MINIO_ENDPOINT,
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        region_name='us-east-1' # Required by boto3 even for local MinIO
    )

def ensure_bucket_exists():
    """Creates the storage bucket if it doesn't already exist on startup."""
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=settings.MINIO_BUCKET_NAME)
        logger.info(f"Bucket '{settings.MINIO_BUCKET_NAME}' already exists.")
    except ClientError:
        logger.info(f"Creating bucket '{settings.MINIO_BUCKET_NAME}'...")
        s3.create_bucket(Bucket=settings.MINIO_BUCKET_NAME)

def upload_file_to_minio(file_bytes: bytes, file_name: str, content_type: str) -> str:
    """Uploads a raw file to MinIO and returns the path."""
    s3 = get_s3_client()
    
    # Ensure bucket exists before uploading
    ensure_bucket_exists()
    
    try:
        s3.put_object(
            Bucket=settings.MINIO_BUCKET_NAME,
            Key=file_name,
            Body=file_bytes,
            ContentType=content_type
        )
        return f"s3://{settings.MINIO_BUCKET_NAME}/{file_name}"
    except ClientError as e:
        logger.error(f"Failed to upload {file_name} to MinIO: {e}")
        raise