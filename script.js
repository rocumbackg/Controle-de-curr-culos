document.addEventListener('DOMContentLoaded', () => {
    const emailForm = document.getElementById('email-form');
    const emailInput = document.getElementById('email');
    const lastSubmissionDay = document.getElementById('last-submission-day');
    const submissionHistory = document.getElementById('submission-history');

    // Load data from localStorage on page load
    updateDashboard();

    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value;
        if (email) {
            saveSubmission(email);
            updateDashboard();
            emailInput.value = '';
        }
    });

    function saveSubmission(email) {
        const submissions = getSubmissions();
        const now = new Date();
        if (!submissions[email]) {
            submissions[email] = [];
        }
        submissions[email].push(now.toISOString());
        localStorage.setItem('submissions', JSON.stringify(submissions));
    }

    function getSubmissions() {
        const submissions = localStorage.getItem('submissions');
        return submissions ? JSON.parse(submissions) : {};
    }

    function updateDashboard() {
        const submissions = getSubmissions();
        const allDates = Object.values(submissions).flat().map(date => new Date(date));

        if (allDates.length === 0) {
            lastSubmissionDay.textContent = 'Nenhum envio registrado.';
            submissionHistory.innerHTML = '';
            return;
        }

        allDates.sort((a, b) => b - a); // Sort dates in descending order

        const lastSubmission = allDates[0];
        lastSubmissionDay.textContent = lastSubmission.toLocaleDateString('pt-BR', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        submissionHistory.innerHTML = '';
        const uniqueEmails = Object.keys(submissions);
        uniqueEmails.forEach(email => {
            const emailDates = submissions[email].map(date => new Date(date));
            emailDates.sort((a, b) => b - a);
            const listItem = document.createElement('li');
            listItem.textContent = `${email} - (enviado em: ${emailDates.map(d => d.toLocaleDateString('pt-BR')).join(', ')})`;
            submissionHistory.appendChild(listItem);
        });
    }
});
