from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0007_increase_field_lengths'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE students_studentprofile
                    ALTER COLUMN created_at SET DEFAULT NOW(),
                    ALTER COLUMN updated_at SET DEFAULT NOW();
            """,
            reverse_sql="""
                ALTER TABLE students_studentprofile
                    ALTER COLUMN created_at DROP DEFAULT,
                    ALTER COLUMN updated_at DROP DEFAULT;
            """,
        ),
    ]
