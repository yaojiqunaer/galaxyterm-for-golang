import {useState} from 'react';
import logo from './assets/images/logo-universal.png';
import './App.css';
import {Greet} from "../wailsjs/go/main/App";
import {main} from "../wailsjs/go/models";
import {LogDebug, LogInfo} from "../wailsjs/runtime/runtime";

6

/**
 * The main component of the application, responsible for rendering the application's main interface and handling user input events.
 *
 * @function App
 * @returns {JSX.Element} Returns the main interface element of the application.
 */
function App() {
    // Initialize resultText with a default prompt message.
    const [resultText, setResultText] = useState("Please enter your name below 👇");
    // Initialize name as an empty string, used to store user input.
    const [name, setName] = useState('');

    /**
     * Update the name state based on input changes.
     *
     * @function updateName
     * @param {Event} e - The input change event.
     */
    const updateName = (e) => {
        LogDebug("Updating: " + e.target.value)
        setName(e.target.value);
    }

    /**
     * Update the resultText state.
     *
     * @function updateResultText
     * @param {string} result - The new text content.
     */
    const updateResultText = (result) => setResultText(result);

    function createPerson() {
        let person = new main.Person();
        let education = new main.Education();
        education.degree = "Bachelor";
        education.school = "Harvard";
        let parent = new main.Person();
        parent.name = "John";
        parent.age = 40;
        let mother = new main.Person();
        mother.name = "Mary";
        mother.age = 35;
        person.name = name;
        person.age = 20;
        person.parent = parent;
        person.mother = mother;
        person.edu = education;
        return person;
    }

    /**
     * Greet the user by their name.
     *
     * Calls the Greet function with the current name, and updates the resultText after completion.
     */
    function greet() {
        LogInfo("Greeting: " + name)
        let person = createPerson();
        Greet(person).then(updateResultText);
    }

    // Render the application's main interface.
    return (
        <div id="App">
            <img src={logo} id="logo" alt="logo"/>
            <div id="result" className="result">{resultText}</div>
            <div id="input" className="input-box">
                <input id="name" className="input" onChange={updateName} autoComplete="off" name="input" type="text"/>
                <button className="btn" onClick={greet}>Greet</button>
            </div>
        </div>
    )
}


export default App
