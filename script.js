document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const emailForm = document.getElementById('email-form');
    const emailInput = document.getElementById('email');
    const submissionHistory = document.getElementById('submission-history');
    const monthlyCountEl = document.getElementById('monthly-count');
    const awaitingCountEl = document.getElementById('awaiting-count');
    const positiveCountEl = document.getElementById('positive-count');
    const negativeCountEl = document.getElementById('negative-count');
    const chartCanvas = document.getElementById('submissions-chart');

    // Supabase Credentials
    const SUPABASE_URL = 'https://nwwsqtpqyhluppfsabij.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53d3NxdHBxeWhsdXBwZnNhYmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODU3MzQsImV4cCI6MjA3ODQ2MTczNH0.F6Uz6YAU94j9cQvoApXpN9uGnwU-4n1NicJr-6-6ZnM';

    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Local State
    let allSubmissions = [];
    let submissionsChart;

    // --- Main Logic ---

    // Initial load
    fetchAllData();

    // Event Listeners
    emailForm.addEventListener('submit', handleFormSubmit);

    // --- Data Functions ---

    async function fetchAllData() {
        const { data, error } = await supabaseClient
            .from('submissions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching submissions:', error);
            return;
        }
        allSubmissions = data;
        updateDashboard(allSubmissions);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const email = emailInput.value;
        if (email) {
            // 1. Create a temporary object for the UI
            const optimisticSubmission = {
                id: Date.now(), // Temporary ID
                email: email,
                status: 'Aguardando resposta',
                created_at: new Date().toISOString()
            };

            // 2. Update the local state and UI immediately
            allSubmissions.unshift(optimisticSubmission);
            updateDashboard(allSubmissions);
            emailInput.value = '';

            // 3. Asynchronously save to the database
            const newSubmission = await saveSubmission(email);

            // 4. If save was successful, replace the temp object with the real one
            if (newSubmission) {
                const index = allSubmissions.findIndex(s => s.id === optimisticSubmission.id);
                if (index !== -1) {
                    allSubmissions[index] = newSubmission;
                    // Re-render history to get correct IDs for status updates
                    renderSubmissionHistory(allSubmissions);
                }
            } else {
                // If save failed, remove the optimistic update
                allSubmissions.shift();
                updateDashboard(allSubmissions);
                alert('Falha ao salvar o envio.');
            }
        }
    }

    async function saveSubmission(email) {
        const { data, error } = await supabaseClient
            .from('submissions')
            .insert([{ email: email }])
            .select()
            .single();
        if (error) {
            console.error('Error saving submission:', error);
            return null;
        }
        return data;
    }

    async function updateSubmissionStatus(id, newStatus) {
        // Optimistically update the local state
        const index = allSubmissions.findIndex(s => s.id === id);
        if (index !== -1) {
            allSubmissions[index].status = newStatus;
            updateDashboard(allSubmissions);
        }

        // Then, send the update to the database
        const { error } = await supabaseClient
            .from('submissions')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            // Revert the change on error
            fetchAllData();
        }
    }

    // --- UI Update Functions ---

    function updateDashboard(submissions) {
        updateStatistics(submissions);
        renderSubmissionHistory(submissions);
        renderSubmissionsChart(submissions);
    }

    function updateStatistics(submissions) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlySubmissions = submissions.filter(s => {
            const subDate = new Date(s.created_at);
            return subDate.getMonth() === currentMonth && subDate.getFullYear() === currentYear;
        });

        monthlyCountEl.textContent = monthlySubmissions.length;
        awaitingCountEl.textContent = submissions.filter(s => s.status === 'Aguardando resposta').length;
        positiveCountEl.textContent = submissions.filter(s => s.status === 'Retorno positivo').length;
        negativeCountEl.textContent = submissions.filter(s => s.status === 'Retorno negativo').length;
    }

    function renderSubmissionHistory(submissions) {
        submissionHistory.innerHTML = '';
        submissions.forEach(submission => {
            const li = document.createElement('li');

            const info = document.createElement('span');
            const submissionDate = new Date(submission.created_at).toLocaleDateString('pt-BR');
            info.textContent = `${submission.email} - ${submissionDate}`;

            const statusSelect = document.createElement('select');
            statusSelect.innerHTML = `
                <option value="Aguardando resposta" ${submission.status === 'Aguardando resposta' ? 'selected' : ''}>Aguardando resposta</option>
                <option value="Retorno positivo" ${submission.status === 'Retorno positivo' ? 'selected' : ''}>Retorno positivo</option>
                <option value="Retorno negativo" ${submission.status === 'Retorno negativo' ? 'selected' : ''}>Retorno negativo</option>
            `;
            statusSelect.addEventListener('change', (e) => {
                updateSubmissionStatus(submission.id, e.target.value);
            });

            li.appendChild(info);
            li.appendChild(statusSelect);
            submissionHistory.appendChild(li);
        });
    }

    function renderSubmissionsChart(submissions) {
        const sortedSubmissions = [...submissions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const submissionsByDay = sortedSubmissions.reduce((acc, s) => {
            const date = new Date(s.created_at).toLocaleDateString('pt-BR');
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});
        const chartData = {
            labels: Object.keys(submissionsByDay),
            datasets: [{
                label: 'Envios por Dia', data: Object.values(submissionsByDay),
                borderColor: '#f2f2f2', tension: 0.1
            }]
        };
        if (submissionsChart) submissionsChart.destroy();
        submissionsChart = new Chart(chartCanvas, {
            type: 'line', data: chartData,
            options: { scales: { y: { beginAtZero: true } } }
        });
    }
});
