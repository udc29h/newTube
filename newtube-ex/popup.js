document.addEventListener('DOMContentLoaded', async () => {
    const ageForm = document.getElementById('age-form');
    const currentAge = document.getElementById('current-age');
    const ageInput = document.getElementById('age');
    const ageDisplay = document.getElementById('age-display');
    const saveButton = document.getElementById('save-age');
    const changeButton = document.getElementById('change-age');
    const status = document.getElementById('status');

    // Check if age is already set
    const { userAge } = await chrome.storage.sync.get('userAge');
    if (userAge) {
        ageForm.style.display = 'none';
        currentAge.style.display = 'block';
        ageDisplay.textContent = userAge;
    }

    // Save age
    saveButton.addEventListener('click', async () => {
        const age = parseInt(ageInput.value);
        if (!age || age < 1 || age > 100) {
            status.textContent = 'Please enter a valid age (1-100)';
            status.classList.add('error');
            return;
        }

        try {
            await chrome.storage.sync.set({ userAge: age });
            ageForm.style.display = 'none';
            currentAge.style.display = 'block';
            ageDisplay.textContent = age;
            status.textContent = 'Age saved successfully!';
            status.classList.remove('error');

            // Notify content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.url?.includes('youtube.com')) {
                chrome.tabs.sendMessage(tab.id, { type: 'AGE_UPDATED', age });
            }
        } catch (error) {
            status.textContent = 'Error saving age. Please try again.';
            status.classList.add('error');
        }
    });

    // Change age button
    changeButton.addEventListener('click', () => {
        ageForm.style.display = 'block';
        currentAge.style.display = 'none';
        ageInput.value = ageDisplay.textContent;
        status.textContent = '';
    });
});