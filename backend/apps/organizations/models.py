from django.db import models

class Organization(models.Model):
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=100, unique=True, help_text="e.g. company.com to auto-approve joining employees")
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class SystemConfiguration(models.Model):
    fuel_price = models.DecimalField(max_digits=10, decimal_places=2, default=103.50)
    default_fuel_efficiency = models.DecimalField(max_digits=10, decimal_places=2, default=15.00)
    co2_factor = models.DecimalField(max_digits=10, decimal_places=2, default=0.15)
    max_seats_limit = models.PositiveIntegerField(default=6)
    require_license_for_driver = models.BooleanField(default=True)

    def __str__(self):
        return f"System Config (Fuel: {self.fuel_price}, Efficiency: {self.default_fuel_efficiency})"
