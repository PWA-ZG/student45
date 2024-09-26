function submitForm() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
  
    fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => {
        if (response.ok) {
          localStorage.setItem('username', username);
          window.location.href = '/profile';
        } else {
          alert('Invalid username or password');  
        }
    })
      .catch((error) => {
        console.error('Error during login:', error);
    });
  }
  