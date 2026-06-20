import comtypes.client
import os

abs_in = os.path.abspath("test.pptx")
# Create dummy pptx
with open("test.pptx", "wb") as f:
    f.write(b"dummy")

try:
    powerpoint = comtypes.client.CreateObject("Powerpoint.Application")
    try:
        deck = powerpoint.Presentations.Open(abs_in, WithWindow=False)
        print("Success with keyword!")
    except Exception as e:
        print("Failed with keyword:", str(e))
        deck = powerpoint.Presentations.Open(abs_in, False, False, False)
        print("Success with positional!")
except Exception as e:
    print("Outer error:", str(e))
finally:
    try:
        powerpoint.Quit()
    except:
        pass
    os.remove("test.pptx")
