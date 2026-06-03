from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0009_fix_email_bform_unique'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                UPDATE students_studentprofile
                SET f_g_contact = '0' || f_g_contact
                WHERE f_g_contact != ''
                  AND f_g_contact IS NOT NULL
                  AND f_g_contact NOT LIKE '0%'
                  AND f_g_contact ~ '^[0-9]';
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
