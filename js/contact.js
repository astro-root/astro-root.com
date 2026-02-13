document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const formMessage = document.getElementById('formMessage');

    const fields = {
        name: document.getElementById('name'),
        email: document.getElementById('email'),
        category: document.getElementById('category'),
        message: document.getElementById('message')
    };

    const errors = {
        name: document.getElementById('nameError'),
        email: document.getElementById('emailError'),
        category: document.getElementById('categoryError'),
        message: document.getElementById('messageError')
    };

    function validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    function validateField(fieldName) {
        const field = fields[fieldName];
        const error = errors[fieldName];
        let isValid = true;
        let errorMessage = '';

        field.classList.remove('error');
        error.textContent = '';

        if (!field.value.trim()) {
            isValid = false;
            errorMessage = 'この項目は必須です';
        } else {
            switch(fieldName) {
                case 'name':
                    if (field.value.trim().length < 2) {
                        isValid = false;
                        errorMessage = '名前は2文字以上で入力してください';
                    }
                    break;
                case 'email':
                    if (!validateEmail(field.value.trim())) {
                        isValid = false;
                        errorMessage = '有効なメールアドレスを入力してください';
                    }
                    break;
                case 'message':
                    if (field.value.trim().length < 10) {
                        isValid = false;
                        errorMessage = 'メッセージは10文字以上で入力してください';
                    }
                    break;
            }
        }

        if (!isValid) {
            field.classList.add('error');
            error.textContent = errorMessage;
        }

        return isValid;
    }

    function validateForm() {
        let isValid = true;
        Object.keys(fields).forEach(fieldName => {
            if (!validateField(fieldName)) {
                isValid = false;
            }
        });
        return isValid;
    }

    Object.keys(fields).forEach(fieldName => {
        const field = fields[fieldName];
        
        field.addEventListener('blur', function() {
            validateField(fieldName);
        });

        field.addEventListener('input', function() {
            if (field.classList.contains('error')) {
                validateField(fieldName);
            }
        });
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateForm()) {
            showMessage('入力内容に誤りがあります。修正してください。', 'error');
            return;
        }

        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.classList.remove('hidden');
        formMessage.classList.add('hidden');

        try {
            const formData = new FormData(form);
            
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                showMessage('お問い合わせを送信しました。ご連絡ありがとうございます！', 'success');
                form.reset();
                
                setTimeout(() => {
                    window.location.href = 'https://astro-root.com/contact-success.html';
                }, 2000);
            } else {
                throw new Error('送信に失敗しました');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('送信に失敗しました。時間をおいて再度お試しいただくか、直接メールでご連絡ください。', 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.classList.add('hidden');
        }
    });

    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = 'form-message ' + type;
        formMessage.classList.remove('hidden');
        
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        if (type === 'error') {
            setTimeout(() => {
                formMessage.classList.add('hidden');
            }, 5000);
        }
    }
});
