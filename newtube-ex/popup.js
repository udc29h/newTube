document.addEventListener('DOMContentLoaded', async () => {
    // Get stored values
    const { userAge, passwordHash } = await chrome.storage.sync.get(['userAge', 'passwordHash']);

    // Get DOM elements
    const setupSection = document.getElementById('setupSection');
    const passwordSection = document.getElementById('passwordSection');
    const changeAgeSection = document.getElementById('changeAgeSection');
    
    // Show appropriate section based on whether setup is complete
    if (!userAge || !passwordHash) {
        setupSection.style.display = 'flex';
        passwordSection.style.display = 'none';
        changeAgeSection.style.display = 'none';
    } else {
        setupSection.style.display = 'none';
        passwordSection.style.display = 'flex';
        changeAgeSection.style.display = 'none';
        document.getElementById('currentAge').textContent = userAge;
    }

    // Setup event listeners
    document.getElementById('setupButton').addEventListener('click', async () => {
        const age = document.getElementById('ageSelect').value;
        const password = document.getElementById('setupPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;
        const errorElement = document.getElementById('setupError');

        if (!password || !confirmPass) {
            errorElement.textContent = 'Please enter and confirm your password';
            return;
        }

        if (password !== confirmPass) {
            errorElement.textContent = 'Passwords do not match';
            return;
        }

        if (password.length < 6) {
            errorElement.textContent = 'Password must be at least 6 characters';
            return;
        }

        try {
            // Hash the password
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Save age and password hash
            await chrome.storage.sync.set({ 
                userAge: parseInt(age),
                passwordHash: passwordHash
            });

            // Notify content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'AGE_UPDATED' });
            });

            // Update UI
            setupSection.style.display = 'none';
            passwordSection.style.display = 'flex';
            document.getElementById('currentAge').textContent = age;
        } catch (error) {
            errorElement.textContent = 'Error saving settings. Please try again.';
            console.error('Setup error:', error);
        }
    });

    document.getElementById('submitPassword').addEventListener('click', async () => {
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('passwordError');

        if (!password) {
            errorElement.textContent = 'Please enter your password';
            return;
        }

        try {
            // Hash the entered password
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const enteredHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Compare with stored hash
            const { passwordHash } = await chrome.storage.sync.get('passwordHash');
            
            if (enteredHash === passwordHash) {
                passwordSection.style.display = 'none';
                changeAgeSection.style.display = 'flex';
                errorElement.textContent = '';
            } else {
                errorElement.textContent = 'Incorrect password';
            }
        } catch (error) {
            errorElement.textContent = 'Error verifying password. Please try again.';
            console.error('Password verification error:', error);
        }
    });

    document.getElementById('updateAge').addEventListener('click', async () => {
        const newAge = document.getElementById('newAgeSelect').value;
        const successElement = document.getElementById('updateSuccess');

        try {
            await chrome.storage.sync.set({ userAge: parseInt(newAge) });
            
            // Notify content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'AGE_UPDATED' });
            });

            document.getElementById('currentAge').textContent = newAge;
            successElement.textContent = 'Age updated successfully!';
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                successElement.textContent = '';
            }, 3000);
        } catch (error) {
            successElement.textContent = 'Error updating age. Please try again.';
            console.error('Age update error:', error);
        }
    });
});