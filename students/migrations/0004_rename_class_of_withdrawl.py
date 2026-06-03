from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0003_merge_student_name'),
    ]

    operations = [
        migrations.RenameField(
            model_name='studentprofile',
            old_name='class_of_withdrawal',
            new_name='class_of_withdrawl',
        ),
    ]
