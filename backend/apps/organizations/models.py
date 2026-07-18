from django.db import models

class Organization(models.Model):
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=100, unique=True, help_text="e.g. company.com to auto-approve joining employees")
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
