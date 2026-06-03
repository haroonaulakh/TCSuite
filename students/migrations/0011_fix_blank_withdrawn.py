from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0010_fix_contacts_leading_zero'),
    ]

    operations = [
        migrations.RunSQL(
            sql="UPDATE students_studentprofile SET withdrawn = 'no' WHERE withdrawn = '' OR withdrawn IS NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
