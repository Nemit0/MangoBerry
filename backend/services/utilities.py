import requests
import random
from typing import Tuple

PRIME_LOWER_CAP: int = 1000
PRIME_UPPER_CAP: int = 10000

def get_location_from_ip(ip: str):
    try:
        response = requests.get(f"http://ip-api.com/json/{ip}")
        data = response.json()
        print("GeoIP response:", data) 

        if data.get("status") == "success":
            return {"lat": data["lat"], "lon": data["lon"]}
        else:
            print("GeoIP failed:", data.get("message"))
    except Exception as e:
        print("GeoIP exception:", e)

    return None

_SMALL_PRIMES = [
    2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47,
    53, 59, 61, 67, 71, 73, 79, 83, 89, 97
]

def _is_probable_prime(n:int, rounds:int = 10) -> bool:
    """
    Miller-Rabin Probabilistic primality test.
    """
    if n < 2:
        return False
    if n in _SMALL_PRIMES:
        return True

    d, r = n - 1, 0
    while d % 2 == 0:
        d >>= 1
        r += 1
    
    for _ in range(rounds):
        a = random.randrange(2, n-2)
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    return True

def random_prime(*, bits: int = 256, rounds:int = 10) -> int:
    """
    Generate a random prime iwth exactly "bits" bits.
    """
    if bits < 2:
        raise ValueError("Number of bits must be at least 2")
    
    while True:
        candidate = random.getrandbits(bits)
        # Ensure correct size and oddness
        candidate |= 1                               # force LSB = 1 (odd)
        candidate |= 1 << (bits - 1)                 # force MSB = 1
        if _is_probable_prime(candidate, rounds):
            return candidate


def random_prime_in_range(
        low: int = PRIME_LOWER_CAP, 
        high: int = PRIME_UPPER_CAP,
        rounds: int = 10
    ) -> int:
    """
    Return a random prime in the half-open interval [low, high).
    """
    if high <= low:
        raise ValueError("high must be greater than low")

    while True:
        candidate = random.randrange(low | 1, high, 2)  # pick odd numbers only
        if _is_probable_prime(candidate, rounds):
            return candidate