async function askAI() {
    const query = document.getElementById("input").value;

    const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query: query,
            feedback: ""
        }),
    });

    const data = await response.json();
    document.getElementById("output").innerText = data.answer;
}
