from django.db import migrations, models


def combine_names(apps, schema_editor):
    """Copy student_f_name + student_l_name → student_name."""
    StudentProfile = apps.get_model('students', 'StudentProfile')
    for s in StudentProfile.objects.all():
        f = (s.student_f_name or '').strip()
        l = (s.student_l_name or '').strip()
        s.student_name = f"{f} {l}".strip() or 'Unknown'
        s.save(update_fields=['student_name'])


def split_names(apps, schema_editor):
    """Reverse: split student_name back into f/l (best-effort)."""
    StudentProfile = apps.get_model('students', 'StudentProfile')
    for s in StudentProfile.objects.all():
        parts = (s.student_name or '').split(' ', 1)
        s.student_f_name = parts[0]
        s.student_l_name = parts[1] if len(parts) > 1 else ''
        s.save(update_fields=['student_f_name', 'student_l_name'])


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0002_add_current_fee'),
    ]

    operations = [
        # 1. Add student_name as nullable first
        migrations.AddField(
            model_name='studentprofile',
            name='student_name',
            field=models.CharField(max_length=200, null=True),
        ),
        # 2. Populate it from the old fields
        migrations.RunPython(combine_names, split_names),
        # 3. Make it non-nullable
        migrations.AlterField(
            model_name='studentprofile',
            name='student_name',
            field=models.CharField(max_length=200),
        ),
        # 4. Drop the old fields
        migrations.RemoveField(model_name='studentprofile', name='student_f_name'),
        migrations.RemoveField(model_name='studentprofile', name='student_l_name'),
    ]
