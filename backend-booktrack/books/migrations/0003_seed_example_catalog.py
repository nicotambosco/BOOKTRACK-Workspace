from django.db import migrations


BOOKS = [
    ('Clean Code', 'Robert C. Martin', 'Prentice Hall', '2008', 'Principios y prácticas para escribir código limpio y mantenible.', '9780132350884', 'EJ-001', 'sistemas', 1, 3, 'libro de consulta'),
    ('The C Programming Language', 'Brian W. Kernighan y Dennis M. Ritchie', 'Prentice Hall', '1988', 'Introducción clásica al lenguaje de programación C.', '9780131103627', 'EJ-002', 'sistemas', 1, 2, 'libro base'),
    ('Introduction to Algorithms', 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest y Clifford Stein', 'MIT Press', '2009', 'Fundamentos de algoritmos, estructuras de datos y análisis de complejidad.', '9780262033848', 'EJ-003', 'sistemas', 2, 4, 'libro base'),
    ('Effective Java', 'Joshua Bloch', 'Addison-Wesley', '2018', 'Buenas prácticas y patrones para desarrollar aplicaciones robustas en Java.', '9780134685991', 'EJ-004', 'sistemas', 2, 2, 'libro de consulta'),
    ('Designing Data-Intensive Applications', 'Martin Kleppmann', "O'Reilly Media", '2017', 'Diseño de sistemas de datos confiables, escalables y mantenibles.', '9781491950357', 'EJ-005', 'sistemas', 3, 3, 'libro de consulta'),
    ('Design Patterns', 'Erich Gamma, Richard Helm, Ralph Johnson y John Vlissides', 'Addison-Wesley', '1994', 'Patrones reutilizables para el diseño de software orientado a objetos.', '9780201633610', 'EJ-006', 'sistemas', 3, 2, 'libro base'),
    ('Calculus: Early Transcendentals', 'James Stewart', 'Cengage Learning', '2016', 'Cálculo diferencial e integral con aplicaciones para ciencias e ingeniería.', '9781285741550', 'EJ-007', 'básicas', 1, 3, 'libro base'),
    ('University Physics with Modern Physics', 'Hugh D. Young y Roger A. Freedman', 'Pearson', '2019', 'Fundamentos de física clásica y moderna para carreras de ingeniería.', '9780135159552', 'EJ-008', 'básicas', 1, 3, 'libro base'),
    ('Chemistry: The Central Science', 'Theodore L. Brown y otros', 'Pearson', '2017', 'Conceptos esenciales de química general con aplicaciones científicas.', '9780134414232', 'EJ-009', 'química', 1, 3, 'libro base'),
    ("Shigley's Mechanical Engineering Design", 'Richard G. Budynas y J. Keith Nisbett', 'McGraw-Hill', '2020', 'Diseño y análisis de elementos de máquinas.', '9780073398211', 'EJ-010', 'mecánica', 3, 3, 'libro base'),
    ('Electrical Engineering: Principles and Applications', 'Allan R. Hambley', 'Pearson', '2018', 'Principios, circuitos y aplicaciones fundamentales de ingeniería eléctrica.', '9780134484143', 'EJ-011', 'eléctrica', 2, 3, 'libro base'),
    ('Engineering Mechanics: Statics', 'R. C. Hibbeler', 'Pearson', '2016', 'Equilibrio de partículas y cuerpos rígidos aplicado a ingeniería.', '9780133918922', 'EJ-012', 'mecánica', 1, 3, 'libro base'),
    ('Probability and Statistics for Engineering and the Sciences', 'Jay L. Devore', 'Cengage Learning', '2016', 'Probabilidad y estadística aplicada a problemas de ingeniería.', '9781305251809', 'EJ-013', 'básicas', 2, 3, 'libro base'),
    ('Linear Algebra and Its Applications', 'David C. Lay, Steven R. Lay y Judi J. McDonald', 'Pearson', '2016', 'Álgebra lineal, espacios vectoriales y aplicaciones.', '9780321982384', 'EJ-014', 'básicas', 1, 3, 'libro base'),
    ('Modern Control Engineering', 'Katsuhiko Ogata', 'Prentice Hall', '2010', 'Modelado, análisis y diseño de sistemas de control modernos.', '9780136156734', 'EJ-015', 'eléctrica', 4, 3, 'libro base'),
    ('Fundamentals of Engineering Thermodynamics', 'Michael J. Moran y Howard N. Shapiro', 'Wiley', '2014', 'Principios de termodinámica y análisis de sistemas energéticos.', '9781118412930', 'EJ-016', 'mecánica', 2, 3, 'libro base'),
]


def seed_catalog(apps, schema_editor):
    Book = apps.get_model('books', 'Book')
    Category = apps.get_model('categories', 'Category')

    for category in ('básicas', 'eléctrica', 'mecánica', 'química', 'sistemas'):
        Category.objects.get_or_create(nombre=category)

    for title, author, publisher, year, description, isbn, inventory, category, course_year, available, book_type in BOOKS:
        cover = f'assets/covers/{isbn}.jpg'
        book, created = Book.objects.get_or_create(
            nro_codigo=f'ISBN-{isbn}',
            defaults={
                'titulo': title,
                'autor': author,
                'editorial': publisher,
                'fecha_publicacion': year,
                'descripcion': description,
                'imagen': cover,
                'nro_inventario': inventory,
                'categoria': category,
                'anio': course_year,
                'disponibles': available,
                'tipo': book_type,
            },
        )
        if not created and (not book.imagen or 'covers.openlibrary.org' in book.imagen):
            book.imagen = cover
            book.save(update_fields=['imagen'])


class Migration(migrations.Migration):
    dependencies = [
        ('categories', '0001_initial'),
        ('books', '0002_book_anio'),
    ]

    operations = [
        # Rollback keeps catalog data to avoid deleting books modified after seeding.
        migrations.RunPython(seed_catalog, migrations.RunPython.noop),
    ]
