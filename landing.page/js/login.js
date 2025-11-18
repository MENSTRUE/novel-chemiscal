/**
 * Fungsi ini menangani proses submit formulir login.
 * Dipanggil oleh atribut onsubmit="handleLogin(event)" di tag <form> pada login.html.
 */
function handleLogin(event) {
  // Mencegah form submit/refresh halaman secara default
  event.preventDefault();

  // Ambil nilai dari input fields
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("remember").checked;

  // Output ke konsol untuk debugging
  console.log("--- Mencoba Login ---");
  console.log("Username/Email:", username);
  console.log("Password:", password); // Dalam aplikasi nyata, jangan pernah log password mentah!
  console.log("Remember Me:", rememberMe);
  console.log("---------------------");

  // Tampilkan notifikasi ke pengguna
  alert(
    `Mencoba masuk sebagai: ${username}\nIngat Saya: ${
      rememberMe ? "Ya" : "Tidak"
    }\n\n(Fungsi Otentikasi Sebenarnya Belum Diimplementasikan, Tambahkan Logika Fetch API di sini)`
  );

  // Di sini Anda akan menambahkan logika untuk:
  // 1. Validasi input lebih lanjut.
  // 2. Mengirim data login ke server menggunakan fetch() atau XMLHttpRequest.
  // 3. Menangani respons dari server (sukses/gagal login).
  // 4. Mengarahkan pengguna ke halaman dashboard jika berhasil.
}
