import random
import time

def random_bool():
    start = time.time()
    i = 0
    while time.time()- start < 30:
        print (i)
        i = i + 1
        time.sleep(1)


if __name__ == "__main__":
    print(random_bool())
