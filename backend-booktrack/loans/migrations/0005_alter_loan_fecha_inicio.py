import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('loans', '0004_loan_extension_estado')]

    operations = [
        migrations.AlterField(
            model_name='loan',
            name='fecha_inicio',
            field=models.DateField(default=django.utils.timezone.localdate),
        ),
    ]
