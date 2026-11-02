from app.database.connection import SessionLocal
from app.services.category_seed import seed_initial_categories


def main() -> None:
    with SessionLocal() as db:
        added = seed_initial_categories(db)
    print(f"Category seed complete: {added} category(s) added.")


if __name__ == "__main__":
    main()
