import os
from flask import Flask, request

app = Flask(__name__)

current_directory = os.path.dirname(__file__)
parent_directory = os.path.abspath(os.path.join(current_directory, os.pardir))
file_path = os.path.join(parent_directory, 'UCFHereForceCam.user.js')

@app.route("/UCFHereForceCam.user.js")
def jsfile():

    with open(file_path, "r") as file:
        contents = file.read()

    replaced_contents = contents.replace(
        "https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/UCFHereCam/UCFHereForceCam.user.js",
        request.url)

    return replaced_contents


if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)