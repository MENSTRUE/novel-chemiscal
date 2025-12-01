
function handleLogin(event) {
  
  event.preventDefault();

  
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("remember").checked;

  
  console.log("--- Mencoba Login ---");
  console.log("Username/Email:", username);
  console.log("Password:", password); 
  console.log("Remember Me:", rememberMe);
  console.log("---------------------");

  
  alert(
    `Mencoba masuk sebagai: ${username}\nIngat Saya: ${
      rememberMe ? "Ya" : "Tidak"
    }\n\n(Fungsi Otentikasi Sebenarnya Belum Diimplementasikan, Tambahkan Logika Fetch API di sini)`
  );

}
