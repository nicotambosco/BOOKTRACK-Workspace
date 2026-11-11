from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('books', '0016_drop_categories'), ('users', '0005_drop_users_table')]
    operations = [migrations.RunSQL('DROP TABLE IF EXISTS comments')]
