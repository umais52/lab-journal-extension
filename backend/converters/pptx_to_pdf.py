import comtypes.client
import os

def convert(input_path, output_path):
    # Re-initialize COM for the thread just in case
    import pythoncom
    pythoncom.CoInitialize()

    powerpoint = comtypes.client.CreateObject("Powerpoint.Application")
    
    # Needs absolute paths for comtypes
    abs_in = os.path.abspath(input_path)
    abs_out = os.path.abspath(output_path)
    
    try:
        # Open the presentation. WithWindow=False is critical when running from a backend thread!
        deck = powerpoint.Presentations.Open(abs_in, WithWindow=False)
        # 32 is the enum for PDF save format
        deck.SaveAs(abs_out, 32)
        deck.Close()
    finally:
        # Important to always quit the background process
        powerpoint.Quit()
