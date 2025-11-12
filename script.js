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
    const calendarContainer = document.getElementById('calendar-container');
    const modal = document.getElementById('submissions-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalSubmissionList = document.getElementById('modal-submission-list');
    const closeButton = document.querySelector('.close-button');

    // Supabase Credentials
    const SUPABASE_URL = 'https://nwwsqtpqyhluppfsabij.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53d3NxdHBxeWhsdXBwZnNhYmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODU3MzQsImV4cCI6MjA3ODQ2MTczNH0.F6Uz6YAU94j9cQvoApXpN9uGnwU-4n1NicJr-6-6ZnM';

    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Local State
    let allSubmissions = [];
    let submissionsChart;
    let calendar;

    // --- Main Logic ---

    // Initial load
    fetchAllData();

    // Event Listeners
    emailForm.addEventListener('submit', handleFormSubmit);
    closeButton.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

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
        initializeCalendar(allSubmissions);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const email = emailInput.value;
        if (email) {
            const tempId = `temp-${Date.now()}`;
            const optimisticSubmission = {
                id: tempId,
                email: email,
                status: 'Aguardando resposta',
                created_at: new Date().toISOString()
            };

            allSubmissions.unshift(optimisticSubmission);
            updateDashboard(allSubmissions);
            emailInput.value = '';

            const newSubmission = await saveSubmission(email);

            const index = allSubmissions.findIndex(s => s.id === tempId);
            if (newSubmission && index !== -1) {
                allSubmissions[index] = newSubmission;
                renderSubmissionHistory(allSubmissions);
                initializeCalendar(allSubmissions);
            } else if (!newSubmission) {
                allSubmissions.splice(index, 1);
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
        const index = allSubmissions.findIndex(s => s.id === id);
        if (index !== -1) {
            allSubmissions[index].status = newStatus;
            updateDashboard(allSubmissions);
        }

        const { error } = await supabaseClient
            .from('submissions')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            fetchAllData();
        }
    }

    // --- UI Update Functions ---

    function updateDashboard(submissions) {
        updateStatistics(submissions);
        renderSubmissionHistory(submissions);
        renderSubmissionsChart(submissions);
    }

    function initializeCalendar(submissions) {
        const datesWithSubmissions = submissions.map(s => new Date(s.created_at));

        if (calendar) {
            calendar.set('enable', datesWithSubmissions);
            return;
        }

        calendar = flatpickr(calendarContainer, {
            inline: true,
            enable: datesWithSubmissions,
            onChange: function(selectedDates, dateStr, instance) {
                if (selectedDates.length > 0) {
                    showSubmissionsForDate(selectedDates[0]);
                }
            }
        });
    }

    function showSubmissionsForDate(selectedDate) {
        const submissionsOnDate = allSubmissions.filter(s => {
            const subDate = new Date(s.created_at);
            return subDate.toDateString() === selectedDate.toDateString();
        });

        modalTitle.textContent = `Envios de ${selectedDate.toLocaleDateString('pt-BR')}`;
        modalSubmissionList.innerHTML = '';

        if (submissionsOnDate.length > 0) {
            submissionsOnDate.forEach(s => {
                const li = document.createElement('li');
                li.textContent = `${s.email} - Status: ${s.status}`;
                modalSubmissionList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'Nenhum envio nesta data.';
            modalSubmissionList.appendChild(li);
        }

        modal.style.display = 'block';
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
