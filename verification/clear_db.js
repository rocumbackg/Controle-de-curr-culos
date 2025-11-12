// verification/clear_db.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Path to the config file
const configPath = './config.js';

// Check if config file exists
if (!fs.existsSync(configPath)) {
    console.error('Error: config.js not found. Please create it from config.example.js and add your Supabase credentials.');
    process.exit(1);
}

// Load Supabase credentials from config.js
// This is a simple and direct way to load the config for a script.
// Note: This approach is not directly loading the variables but executing the file content.
// A more robust solution might parse the file, but this works for the current structure.
const configContent = fs.readFileSync(configPath, 'utf-8');
eval(configContent);

// Ensure the variables are loaded
if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    console.error('Error: SUPABASE_URL or SUPABASE_ANON_KEY is not defined in config.js.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function clearSubmissions() {
    console.log('Attempting to clear the submissions table...');
    const { error } = await supabase
        .from('submissions')
        .delete()
        .neq('id', 0); // Deletes all rows

    if (error) {
        console.error('Error clearing database:', error.message);
    } else {
        console.log('Submissions table cleared successfully.');
    }
}

clearSubmissions();
