from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    DEPARTMENT_CHOICES = [
        ('Engineering', 'Engineering'),
        ('Sales', 'Sales'),
        ('Marketing', 'Marketing'),
        ('Operations', 'Operations'),
        ('Finance', 'Finance'),
        ('HR', 'Human Resources'),
        ('Legal', 'Legal'),
        ('Product', 'Product Management'),
    ]

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES, default='Engineering')
    employee_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    average_rating = models.FloatField(default=5.0)
    total_co2_saved = models.FloatField(default=0.0)  # in kg
    total_fuel_saved = models.FloatField(default=0.0) # in liters
    total_money_saved = models.FloatField(default=0.0) # in currency units (e.g. INR)

    # Use email as username field for auth
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.department})"
