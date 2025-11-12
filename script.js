document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const emailForm = document.getElementById('email-form');
    const emailInput = document.getElementById('email');
    const submissionHistory = document.getElementById('submission-history');

    // Supabase credentials are now loaded from config.js
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- Main Logic ---

    // Initial load
    fetchSubmissions();

    // Event Listeners
    emailForm.addEventListener('submit', handleFormSubmit);

    // --- Data Functions ---

    async function fetchSubmissions() {
        const { data, error } = await supabaseClient
            .from('submissions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching submissions:', error);
            return;
        }
        renderSubmissionHistory(data);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const email = emailInput.value;
        if (email) {
            // Optimistically add to UI
            const newSubmission = {
                email: email,
                status: 'Aguardando resposta',
                created_at: new Date().toISOString()
            };

            // Save to database
            const { data, error } = await supabaseClient
                .from('submissions')
                .insert([{ email: email }])
                .select()
                .single();

            if (error) {
                console.error('Error saving submission:', error);
                alert('Falha ao salvar o envio.');
                // Optionally remove the optimistic update here
            } else {
                // On success, refresh the list from the database to ensure consistency
                fetchSubmissions();
            }

            emailInput.value = '';
        }
    }

    async function updateSubmissionStatus(id, newStatus) {
        const { error } = await supabaseClient
            .from('submissions')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            alert('Falha ao atualizar o status.');
            fetchSubmissions(); // Refresh to revert optimistic UI
        }
    }

    // --- UI Update Functions ---

    function renderSubmissionHistory(submissions) {
        submissionHistory.innerHTML = '';
        if (!submissions) return;

        submissions.forEach(submission => {
            const li = document.createElement('li');

            const info = document.createElement('span');
            const submissionDate = new Date(submission.created_at).toLocaleDateString('pt-BR');
            info.textContent = `${submission.email} - ${submissionDate}`;

            const statusSelect = document.createElement('select');
            statusSelect.innerHTML = `
                <option value="Aguardando resposta" ${submission.status === 'Aguardando resposta' ? 'selected' : ''}>Aguardando</option>
                <option value="Retorno positivo" ${submission.status === 'Retorno positivo' ? 'selected' : ''}>Positivo</option>
                <option value="Retorno negativo" ${submission.status === 'Retorno negativo' ? 'selected' : ''}>Negativo</option>
            `;

            // Add a data attribute to store the submission ID
            statusSelect.dataset.id = submission.id;

            statusSelect.addEventListener('change', (e) => {
                const submissionId = parseInt(e.target.dataset.id);
                updateSubmissionStatus(submissionId, e.target.value);
            });

            li.appendChild(info);
            li.appendChild(statusSelect);
            submissionHistory.appendChild(li);
        });
    }
});
