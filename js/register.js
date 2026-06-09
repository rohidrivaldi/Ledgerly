/* =============================================
   register.js — pengontrol logika pendaftaran
   ============================================= */

// Redirect jika sudah login
(function() {
  let ud = localStorage.getItem('ledgerly_user');
  if (ud) {
    window.location.href = 'dasbor.html';
  }
})();

// Mengatur perpindahan kartu paket
function togglePlan(plan) {
  var starterCard = document.getElementById('plan-card-starter');
  var professionalCard = document.getElementById('plan-card-professional');
  var enterpriseCard = document.getElementById('plan-card-enterprise');
  
  var starterFields = document.getElementById('starter-fields-area');
  var enterpriseContact = document.getElementById('enterprise-contact-area');
  
  var radioStarter = document.getElementById('plan-starter');
  var radioProfessional = document.getElementById('plan-professional');
  var radioEnterprise = document.getElementById('plan-enterprise');
  
  var regPassword = document.getElementById('reg-password');
  
  // Reset kelas aktif
  starterCard.classList.remove('active');
  professionalCard.classList.remove('active');
  enterpriseCard.classList.remove('active');
  
  if (plan === 'starter') {
    radioStarter.checked = true;
    starterCard.classList.add('active');
    starterFields.style.display = 'block';
    enterpriseContact.style.display = 'none';
    regPassword.setAttribute('required', 'required');
  } else if (plan === 'professional') {
    radioProfessional.checked = true;
    professionalCard.classList.add('active');
    starterFields.style.display = 'block';
    enterpriseContact.style.display = 'none';
    regPassword.setAttribute('required', 'required');
  } else {
    radioEnterprise.checked = true;
    enterpriseCard.classList.add('active');
    starterFields.style.display = 'none';
    enterpriseContact.style.display = 'block';
    regPassword.removeAttribute('required');
  }
}

// Lihat / Sembunyikan Kata Sandi
function togglePasswordVisibility(inputId, eyeId, eyeOffId) {
  var input = document.getElementById(inputId);
  var iconEye = document.getElementById(eyeId);
  var iconEyeOff = document.getElementById(eyeOffId);
  if (input.type === 'password') {
    input.type = 'text';
    iconEye.style.display = 'none';
    iconEyeOff.style.display = 'block';
  } else {
    input.type = 'password';
    iconEye.style.display = 'block';
    iconEyeOff.style.display = 'none';
  }
}

// Validasi kekuatan kata sandi real-time
function validatePasswordStrength() {
  var pw = document.getElementById('reg-password').value;
  
  // Kriteria UAT
  var hasLength = pw.length >= 8;
  var hasUpper = /[A-Z]/.test(pw);
  var hasLower = /[a-z]/.test(pw);
  var hasNum = /[0-9]/.test(pw);
  var hasSpec = /[@$!%*?&]/.test(pw);
  
  updateCriterionElement('crit-len', hasLength, 'Minimal 8 karakter');
  updateCriterionElement('crit-upper', hasUpper, 'Minimal 1 huruf besar (A-Z)');
  updateCriterionElement('crit-lower', hasLower, 'Minimal 1 huruf kecil (a-z)');
  updateCriterionElement('crit-num', hasNum, 'Minimal 1 angka (0-9)');
  updateCriterionElement('crit-spec', hasSpec, 'Minimal 1 karakter spesial (@$!%*?&)');
  
  // Hitung jumlah kriteria terpenuhi
  var score = 0;
  if (hasLength) score++;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNum) score++;
  if (hasSpec) score++;
  
  var bar1 = document.getElementById('pw-bar-1');
  var bar2 = document.getElementById('pw-bar-2');
  var bar3 = document.getElementById('pw-bar-3');
  var label = document.getElementById('strength-label');
  var btn = document.getElementById('reg-submit-btn');
  
  // Reset bar
  bar1.style.background = 'var(--slate-200)';
  bar2.style.background = 'var(--slate-200)';
  bar3.style.background = 'var(--slate-200)';
  
  if (pw.length === 0) {
    label.textContent = 'Belum diisi';
    label.style.color = 'var(--slate-400)';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    return;
  }
  
  var allMet = hasLength && hasUpper && hasLower && hasNum && hasSpec;
  
  // Warna bar bergantung kekuatan
  if (score <= 2) {
    label.textContent = 'Lemah 🔴';
    label.style.color = 'var(--rose-600)';
    bar1.style.background = 'var(--rose-500)';
  } else if (score <= 4) {
    label.textContent = 'Sedang 🟡';
    label.style.color = 'var(--amber-600)';
    bar1.style.background = 'var(--amber-500)';
    bar2.style.background = 'var(--amber-500)';
  } else {
    label.textContent = 'Kuat 🟢';
    label.style.color = 'var(--emerald-600)';
    bar1.style.background = 'var(--emerald-500)';
    bar2.style.background = 'var(--emerald-500)';
    bar3.style.background = 'var(--emerald-500)';
  }
  
  // Aktifkan / Nonaktifkan tombol submit pendaftaran
  if (allMet) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  }
}

// Update tampilan baris kriteria checklist
function updateCriterionElement(id, met, text) {
  var el = document.getElementById(id);
  if (met) {
    el.innerHTML = '✅ ' + text;
    el.style.color = 'var(--emerald-600)';
  } else {
    el.innerHTML = '❌ ' + text;
    el.style.color = 'var(--rose-600)';
  }
}

// Penanganan submit form registrasi
async function handleRegister(e) {
  e.preventDefault();
  
  var name = document.getElementById('reg-name').value.trim();
  var bisnis = document.getElementById('reg-bisnis').value.trim();
  var email = document.getElementById('reg-email').value.trim();
  var waInput = document.getElementById('reg-wa').value.trim();
  var password = document.getElementById('reg-password').value;
  var errDiv = document.getElementById('register-error');
  var btn = document.getElementById('reg-submit-btn');
  
  // Sanitasi nomor WhatsApp (harus numeric dan diawali 62)
  var waClean = waInput.replace(/[^0-9]/g, '');
  if (waClean.startsWith('0')) {
    waClean = waClean.substring(1);
  }
  
  // Validasi panjang digit nomor seluler Indonesia (9 hingga 13 digit)
  if (waClean.length < 9 || waClean.length > 13) {
    errDiv.textContent = 'Nomor WhatsApp tidak valid. Harap masukkan antara 9 hingga 13 digit (setelah kode negara +62).';
    errDiv.style.display = 'block';
    errDiv.style.color = 'var(--rose-700)';
    errDiv.style.borderColor = 'var(--rose-200)';
    errDiv.style.background = 'var(--rose-50)';
    return; // Hentikan pendaftaran
  }
  
  if (!waClean.startsWith('62')) {
    waClean = '62' + waClean;
  }
  var waNum = parseInt(waClean);
  
  // Peta pilihan paket: starter -> 'starter', professional -> 'business' (untuk database), enterprise -> 'enterprise'
  var planRadio = document.querySelector('input[name="plan"]:checked');
  var planValue = planRadio ? planRadio.value : 'professional';
  var paketDb = planValue === 'professional' ? 'business' : planValue;
  
  errDiv.textContent = 'Mendaftarkan akun Anda...';
  errDiv.style.display = 'block';
  errDiv.style.color = 'var(--indigo-600)';
  errDiv.style.borderColor = 'var(--indigo-200)';
  errDiv.style.background = 'var(--indigo-50)';
  
  btn.disabled = true;
  btn.style.opacity = '0.7';
  btn.style.cursor = 'wait';
  
  if (window.supabaseClient) {
    try {
      // 1. Daftarkan kredensial di Supabase Auth
      const { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password
      });
      
      if (error) throw error;
      
      if (data && data.user) {
        // 2. Sisipkan data profil pengguna baru ke tabel Users di database Supabase
        const { error: profileError } = await window.supabaseClient
          .from('Users')
          .insert({
            user_id: data.user.id,
            email: email,
            nama: name,
            bisnis: bisnis,
            role: 'pemilik',
            noTelp: waNum,
            paket: paketDb
          });
        
        if (profileError) {
          console.warn("Gagal menyisipkan profil pengguna baru ke tabel Users:", profileError.message);
        }
        
        // Tampilkan notifikasi sukses
        errDiv.innerHTML = '<strong>Pendaftaran berhasil!</strong> 🎉 Silakan cek kotak masuk email Anda (<strong>' + email + '</strong>) untuk melakukan konfirmasi pendaftaran sebelum masuk ke sistem.';
        errDiv.style.display = 'block';
        errDiv.style.color = 'var(--emerald-700)';
        errDiv.style.borderColor = 'var(--emerald-200)';
        errDiv.style.background = 'var(--emerald-50)';
        
        // Reset form & indikator kekuatan
        document.getElementById('form-register').reset();
        validatePasswordStrength();
      } else {
        throw new Error('Respons pendaftaran Supabase tidak valid.');
      }
    } catch (err) {
      console.warn("Gagal mendaftar ke Supabase:", err.message);
      errDiv.textContent = 'Pendaftaran gagal: ' + (err.message || 'Silakan periksa kembali data Anda.');
      errDiv.style.display = 'block';
      errDiv.style.color = 'var(--rose-700)';
      errDiv.style.borderColor = 'var(--rose-200)';
      errDiv.style.background = 'var(--rose-50)';
      
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  } else {
    errDiv.textContent = 'Layanan database cloud Supabase tidak tersedia secara lokal saat ini.';
    errDiv.style.display = 'block';
    errDiv.style.color = 'var(--rose-700)';
    errDiv.style.borderColor = 'var(--rose-200)';
    errDiv.style.background = 'var(--rose-50)';
    
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
}
