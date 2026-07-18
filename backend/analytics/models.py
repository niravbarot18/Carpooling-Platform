from django.db import models

class DailyAggregate(models.Model):
    date = models.DateField(unique=True)
    total_trips = models.IntegerField(default=0)
    total_distance = models.FloatField(default=0.0)  # in km
    total_co2_saved = models.FloatField(default=0.0)  # in kg
    total_fuel_saved = models.FloatField(default=0.0) # in liters
    total_money_saved = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Daily Aggregate for {self.date} - Trips: {self.total_trips}"


class DepartmentAggregate(models.Model):
    department = models.CharField(max_length=50, unique=True)
    total_trips_taken = models.IntegerField(default=0)
    total_trips_offered = models.IntegerField(default=0)
    total_co2_saved = models.FloatField(default=0.0)
    total_fuel_saved = models.FloatField(default=0.0)
    total_money_saved = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Dept: {self.department} - Trips Taken: {self.total_trips_taken}"
