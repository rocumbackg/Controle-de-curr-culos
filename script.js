document.addEventListener('DOMContentLoaded', () => {
    const emailForm = document.getElementById('email-form');
    const emailInput = document.getElementById('email');
    const lastSubmissionDay = document.getElementById('last-submission-day');
    const submissionHistory = document.getElementById('submission-history');

    const SUPABASE_URL = 'https://nwwsqtpqyhluppfsabij.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53d3NxdHBxeWhsdXBwZnNhYmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODU3MzQsImV4cCI6MjA3ODQ2MTczNH0.F6Uz6YAU94j9cQvoApXpN9uGnwU-4n1NicJr-6-6ZnM';

    // Correctly initialize the client, avoiding the shadowing error
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Load data from Supabase on page load
    updateDashboard();

    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        if (email) {
            await saveSubmission(email);
            await updateDashboard();
            emailInput.value = '';
        }
    });

    async function saveSubmission(email) {
        const { error } = await supabaseClient
            .from('submissions')
            .insert([{ email: email }]);
        if (error) {
            console.error('Error saving submission:', error);
        }
    }

    async function getSubmissions() {
        const { data, error } = await supabaseClient
            .from('submissions')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching submissions:', error);
            return [];
        }
        return data;
    }

    async function updateDashboard() {
        const submissions = await getSubmissions();

        if (submissions.length === 0) {
            lastSubmissionDay.textContent = 'Nenhum envio registrado.';
            submissionHistory.innerHTML = '';
            return;
        }

        const lastSubmission = new Date(submissions[0].created_at);
        lastSubmissionDay.textContent = lastSubmission.toLocaleDateString('pt-BR', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        submissionHistory.innerHTML = '';
        const submissionsByEmail = {};
        submissions.forEach(submission => {
            if (!submissionsByEmail[submission.email]) {
                submissionsByEmail[submission.email] = [];
            }
            submissionsByEmail[submission.email].push(new Date(submission.created_at));
        });

        for (const email in submissionsByEmail) {
            const dates = submissionsByEmail[email];
            const listItem = document.createElement('li');
            listItem.textContent = `${email} - (enviado em: ${dates.map(d => d.toLocaleDateString('pt-BR')).join(', ')})`;
            submissionHistory.appendChild(listItem);
        }
    }
});
