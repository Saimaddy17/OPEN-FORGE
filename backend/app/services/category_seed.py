from sqlalchemy.orm import Session

from app.models.category import Category


INITIAL_CATEGORIES = (
    ("Developer Tools", "developer-tools"),
    ("AI & Machine Learning", "ai-machine-learning"),
    ("Productivity", "productivity"),
    ("Security", "security"),
    ("Databases", "databases"),
    ("Design", "design"),
)


def seed_initial_categories(db: Session) -> int:
    """Insert missing initial categories, returning the number created."""
    existing = db.query(Category).all()
    existing_names = {category.name.casefold() for category in existing}
    existing_slugs = {category.slug.casefold() for category in existing}

    added = 0
    for name, slug in INITIAL_CATEGORIES:
        if name.casefold() in existing_names or slug.casefold() in existing_slugs:
            continue
        db.add(Category(name=name, slug=slug, is_active=True))
        existing_names.add(name.casefold())
        existing_slugs.add(slug.casefold())
        added += 1

    db.commit()
    return added
