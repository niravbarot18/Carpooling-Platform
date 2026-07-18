import os
import django
from datetime import datetime, timedelta
from django.utils import timezone
from decimal import Decimal
import json

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'carpool_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from vehicles.models import Vehicle
from rides.models import Ride
from bookings.models import Booking
from trips.models import Trip
from wallet.models import Wallet, Transaction
from notifications.models import Notification

User = get_user_model()

def seed_db():
    print("Starting database seeding for Enterprise Carpooling Platform...")
    
    # 1. Clean existing records to prevent unique constraints
    print("Clearing old records...")
    Notification.objects.all().delete()
    Transaction.objects.all().delete()
    Wallet.objects.all().delete()
    Trip.objects.all().delete()
    Booking.objects.all().delete()
    Ride.objects.all().delete()
    Vehicle.objects.all().delete()
    User.objects.all().delete()

    # 2. Create Users
    print("Creating corporate users...")
    
    # Rohan Sharma - Senior Engineer (Driver)
    rohan = User.objects.create_user(
        email='rohan.sharma@enterprise.com',
        username='rohan',
        password='password123',
        first_name='Rohan',
        last_name='Sharma',
        phone='+91 98765 43210',
        department='Engineering',
        employee_id='EMP1024',
        average_rating=4.9
    )
    
    # Priya Patel - Product Manager (Driver)
    priya = User.objects.create_user(
        email='priya.patel@enterprise.com',
        username='priya',
        password='password123',
        first_name='Priya',
        last_name='Patel',
        phone='+91 98765 12345',
        department='Product',
        employee_id='EMP2048',
        average_rating=4.8
    )

    # Amit Verma - Sales Executive (Passenger)
    amit = User.objects.create_user(
        email='amit.verma@enterprise.com',
        username='amit',
        password='password123',
        first_name='Amit',
        last_name='Verma',
        phone='+91 91234 56789',
        department='Sales',
        employee_id='EMP4096',
        average_rating=5.0
    )

    print("Users created: Rohan, Priya, Amit.")

    # 3. Create Wallets
    print("Configuring corporate wallets...")
    w_rohan = Wallet.objects.create(user=rohan, balance=Decimal('1000.00'))
    w_priya = Wallet.objects.create(user=priya, balance=Decimal('1200.00'))
    w_amit = Wallet.objects.create(user=amit, balance=Decimal('1500.00'))

    # Add deposit transactions
    Transaction.objects.create(wallet=w_rohan, amount=Decimal('1000.00'), transaction_type='Credit', reference='Enterprise Sign-up bonus')
    Transaction.objects.create(wallet=w_priya, amount=Decimal('1200.00'), transaction_type='Credit', reference='Enterprise Sign-up bonus')
    Transaction.objects.create(wallet=w_amit, amount=Decimal('1500.00'), transaction_type='Credit', reference='Enterprise Sign-up bonus')

    # 4. Create Vehicles
    print("Registering employee vehicles...")
    
    # Rohan's Tesla Model 3 (EV)
    tesla = Vehicle.objects.create(
        user=rohan,
        name='Tesla Model 3',
        registration_number='KA 51 ME 4321',
        capacity=4,
        fuel_type='EV',
        is_default=True
    )
    
    # Priya's Honda Civic (Hybrid)
    civic = Vehicle.objects.create(
        user=priya,
        name='Honda Civic',
        registration_number='KA 03 MP 9876',
        capacity=4,
        fuel_type='Hybrid',
        is_default=True
    )

    print("Vehicles registered: Rohan's Tesla Model 3 (EV), Priya's Honda Civic (Hybrid).")

    # 5. Create Rides & Trips
    print("Scheduling upcoming commute rides...")
    
    # Bangalore Hub coordinate points
    ec_hq = {"name": "Main Office HQ (Electronic City)", "lat": 12.8406, "lng": 77.6753}
    hsr_south = {"name": "South Hub (HSR Layout)", "lat": 12.9116, "lng": 77.6388}
    manyata_north = {"name": "North Office (Manyata Tech Park)", "lat": 13.0408, "lng": 77.6244}
    koramangala_west = {"name": "West Hub (Koramangala)", "lat": 12.9352, "lng": 77.6244}

    now = timezone.now()

    # Ride 1: Rohan drives from HQ (Electronic City) to Koramangala tomorrow evening
    ride1 = Ride.objects.create(
        driver=rohan,
        vehicle=tesla,
        start_address=ec_hq["name"],
        start_lat=ec_hq["lat"],
        start_lng=ec_hq["lng"],
        end_address=koramangala_west["name"],
        end_lat=koramangala_west["lat"],
        end_lng=koramangala_west["lng"],
        route_polyline=json.dumps([ec_hq, koramangala_west]),
        departure_time=now + timedelta(days=1, hours=6), # tomorrow evening
        total_seats=3,
        available_seats=3,
        price_per_seat=Decimal('150.00'),
        status='Published',
        estimated_distance=15.2,
        estimated_duration=35.0,
        estimated_co2_saved=5.47,
        estimated_fuel_saved=3.65
    )
    Trip.objects.create(ride=ride1, status='Scheduled')

    # Ride 2: Priya drives from Manyata (North) to HSR (South) tomorrow morning
    ride2 = Ride.objects.create(
        driver=priya,
        vehicle=civic,
        start_address=manyata_north["name"],
        start_lat=manyata_north["lat"],
        start_lng=manyata_north["lng"],
        end_address=hsr_south["name"],
        end_lat=hsr_south["lat"],
        end_lng=hsr_south["lng"],
        route_polyline=json.dumps([manyata_north, hsr_south]),
        departure_time=now + timedelta(days=1, hours=-3), # tomorrow morning
        total_seats=3,
        available_seats=3,
        price_per_seat=Decimal('200.00'),
        status='Published',
        estimated_distance=20.5,
        estimated_duration=45.0,
        estimated_co2_saved=7.38,
        estimated_fuel_saved=4.92
    )
    Trip.objects.create(ride=ride2, status='Scheduled')

    # Create one Completed Ride for Rohan to show in history and populate analytics
    completed_ride = Ride.objects.create(
        driver=rohan,
        vehicle=tesla,
        start_address=koramangala_west["name"],
        start_lat=koramangala_west["lat"],
        start_lng=koramangala_west["lng"],
        end_address=ec_hq["name"],
        end_lat=ec_hq["lat"],
        end_lng=ec_hq["lng"],
        route_polyline=json.dumps([koramangala_west, ec_hq]),
        departure_time=now - timedelta(days=1), # yesterday
        total_seats=3,
        available_seats=1,
        price_per_seat=Decimal('150.00'),
        status='Completed',
        estimated_distance=15.2,
        estimated_duration=35.0,
        estimated_co2_saved=5.47,
        estimated_fuel_saved=3.65
    )
    # Create associated completed trip
    Trip.objects.create(
        ride=completed_ride, 
        status='Completed', 
        start_time=now - timedelta(days=1, minutes=35),
        end_time=now - timedelta(days=1)
    )

    # Book Amit (passenger) onto the completed ride to trigger stats
    Booking.objects.create(
        ride=completed_ride,
        passenger=amit,
        seats_booked=2,
        status='Approved',
        paid=True,
        match_score=94
    )

    # Add historical transaction to Amit's wallet for the completed booking
    Transaction.objects.create(
        wallet=w_amit,
        amount=Decimal('300.00'),
        transaction_type='Debit',
        reference=f"Payment for Ride {completed_ride.id} booking"
    )
    
    # Add earning to Rohan's wallet
    Transaction.objects.create(
        wallet=w_rohan,
        amount=Decimal('300.00'),
        transaction_type='Credit',
        reference=f"Earnings from Ride {completed_ride.id} booking"
    )

    # Update passenger metrics
    amit.total_co2_saved = 3.6
    amit.total_fuel_saved = 2.4
    amit.total_money_saved = 450
    amit.save()

    # Update driver metrics
    rohan.total_co2_saved = 7.2
    rohan.total_fuel_saved = 4.8
    rohan.total_money_saved = 300
    rohan.save()

    print("Seeded successfully! Standard test credentials:")
    print("Driver: rohan.sharma@enterprise.com / password123")
    print("Driver: priya.patel@enterprise.com / password123")
    print("Passenger: amit.verma@enterprise.com / password123")

if __name__ == '__main__':
    seed_db()
