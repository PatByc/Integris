import os
from logging.config import fileConfig

from dotenv import find_dotenv, load_dotenv
from sqlalchemy import engine_from_config, pool

from alembic import context

load_dotenv(find_dotenv())

config = context.config

db_url = os.environ.get("DATABASE_URL", "")
if not db_url:
    raise RuntimeError("DATABASE_URL environment variable is not set")
# Alembic uses a sync engine; strip async driver prefix so psycopg2 is used
db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=None,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=None)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
