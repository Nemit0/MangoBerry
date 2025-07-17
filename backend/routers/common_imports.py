import logging
import sys
from fastapi import APIRouter

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

formatter = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    "%Y-%m-%d %H:%M:%S"
)

stderr_handler = logging.StreamHandler(sys.stderr)
stderr_handler.setFormatter(formatter)
logger.addHandler(stderr_handler)

stdout_handler = logging.StreamHandler(sys.stdout)
stdout_handler.setFormatter(formatter)
logger.addHandler(stdout_handler)

# Suppress logging list
supress_prefixes = [
    "pymongo",
    "pymongo.pool",
    "pymongo.server",
    "pymongo.topology",
    "botocore",
    "botocore.configprovider",
    "boto3"
]

for name in supress_prefixes:
    logging.getLogger(name).setLevel(logging.WARNING)