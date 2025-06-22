import os
from flask import Flask, request

app = Flask(__name__)

current_directory = os.path.dirname(__file__)
parent_directory = os.path.abspath(os.path.join(current_directory, os.pardir))

@app.route("/<filename>.user.js")
def anyjsfile(filename):
    full_filename = f"{filename}.user.js"
    js_file_path = os.path.join(parent_directory, full_filename)
    if not os.path.exists(js_file_path):
        return f"{full_filename} does not exist."
    
    with open(js_file_path, "r") as file:
        contents = file.read()

    # TODO: Change this to editing the lines (downloadURL, updateURL) directly
    replaced_contents = contents.replace(
        f"https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/UCFHereCam/UCFHereCamIntercept.user.js",
        request.url)

    return replaced_contents

if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)