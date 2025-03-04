// Debug helper
console.log('Script loading...');

// Add this at the beginning of your script.js file
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Error:', message, 'at line', lineno);
    alert('Error: ' + message + '\nLine: ' + lineno);
    return true;
};

// Wrap your main code in a try-catch
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    try {
        // Initialize Firebase database
        database = firebase.database();
        
        // Check for share code in URL
        const urlParams = new URLSearchParams(window.location.search);
        shareCode = urlParams.get('share');
        
        if (shareCode) {
            // If share code exists, use it to load data
            workoutRef = database.ref('workouts/' + shareCode);
            loadFromCloudStorage();
        } else {
            // Generate a new share code
            shareCode = generateShareCode();
            workoutRef = database.ref('workouts/' + shareCode);
            
            // Update URL with share code
            const newUrl = window.location.origin + window.location.pathname + '?share=' + shareCode;
            window.history.pushState({}, '', newUrl);
            
            // Show share link
            showShareLink(newUrl);
        }
        
        // Listen for changes in the database
        workoutRef.on('value', (snapshot) => {
            const cloudData = snapshot.val();
            if (cloudData && Object.keys(cloudData).length > 0) {
                // Only update if there's actual data
                workoutData = cloudData;
                renderWorkouts();
            }
        });
        
        // DOM Elements
        const prevDayBtn = document.getElementById('prevDay');
        const nextDayBtn = document.getElementById('nextDay');
        const currentDateEl = document.getElementById('currentDate');
        const person1WorkoutsEl = document.getElementById('person1Workouts');
        const person2WorkoutsEl = document.getElementById('person2Workouts');
        const person1NameEl = document.getElementById('person1Name');
        const person2NameEl = document.getElementById('person2Name');
        
        console.log('Elements found:', 
            !!prevDayBtn, 
            !!nextDayBtn, 
            !!currentDateEl, 
            !!person1WorkoutsEl, 
            !!person2WorkoutsEl
        );
        
        // Settings Modal Elements
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettingsBtn = settingsModal.querySelector('.close');
        const person1NameInput = document.getElementById('person1NameInput');
        const person2NameInput = document.getElementById('person2NameInput');
        const saveSettingsBtn = document.getElementById('saveSettings');
        
        // Accountability Modal Elements
        const accountabilityModal = document.getElementById('accountabilityModal');
        const closeAccountabilityBtn = accountabilityModal.querySelector('.close');
        const reasonSelect = document.getElementById('reasonSelect');
        const otherReasonText = document.getElementById('otherReasonText');
        const consequenceDiv = document.getElementById('consequenceDiv');
        const consequenceText = document.getElementById('consequenceText');
        const submitReasonBtn = document.getElementById('submitReason');
        
        // Application State
        let currentDate = new Date();
        let workoutData = loadWorkoutData();
        let currentWorkoutForAccountability = null;
        
        // Load user settings
        loadUserSettings();
        
        // Event Listeners
        prevDayBtn.addEventListener('click', navigateDay(-1));
        nextDayBtn.addEventListener('click', navigateDay(1));
        
        // Settings Modal
        settingsBtn.addEventListener('click', openSettingsModal);
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
        saveSettingsBtn.addEventListener('click', saveUserSettings);
        
        // Accountability Modal
        reasonSelect.addEventListener('change', handleReasonChange);
        closeAccountabilityBtn.addEventListener('click', closeAccountabilityModal);
        submitReasonBtn.addEventListener('click', submitAccountabilityReason);
        
        // Initialize the app
        updateDateDisplay();
        renderWorkouts();
        
        // Functions
        function navigateDay(offset) {
            return function() {
                currentDate.setDate(currentDate.getDate() + offset);
                updateDateDisplay();
                renderWorkouts();
            };
        }
        
        function updateDateDisplay() {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            currentDateEl.textContent = currentDate.toLocaleDateString('en-US', options);
        }
        
        function renderWorkouts() {
            // Clear the containers
            person1WorkoutsEl.innerHTML = '';
            person2WorkoutsEl.innerHTML = '';
            
            // Get workouts for the current date
            const dateKey = formatDate(currentDate);
            
            // Debug output to see what's happening
            console.log('Current date:', dateKey);
            console.log('Workout data:', workoutData);
            
            // Force generate sample workouts if none exist
            const person1Workouts = generateSampleWorkouts('person1', currentDate);
            const person2Workouts = generateSampleWorkouts('person2', currentDate);
            
            // Save these workouts to storage
            if (!workoutData.person1) workoutData.person1 = {};
            if (!workoutData.person2) workoutData.person2 = {};
            
            workoutData.person1[dateKey] = person1Workouts;
            workoutData.person2[dateKey] = person2Workouts;
            saveWorkoutData();
            
            // Render workouts for person 1
            if (person1Workouts.length === 0) {
                person1WorkoutsEl.innerHTML = '<p class="no-workouts">No workouts scheduled for today.</p>';
            } else {
                person1Workouts.forEach(workout => {
                    renderWorkoutItem(workout, person1WorkoutsEl, 'person1', dateKey);
                });
            }
            
            // Render workouts for person 2
            if (person2Workouts.length === 0) {
                person2WorkoutsEl.innerHTML = '<p class="no-workouts">No workouts scheduled for today.</p>';
            } else {
                person2Workouts.forEach(workout => {
                    renderWorkoutItem(workout, person2WorkoutsEl, 'person2', dateKey);
                });
            }
        }
        
        function renderWorkoutItem(workout, container, personId, dateKey) {
            const workoutEl = document.createElement('div');
            workoutEl.className = `workout-item ${workout.completed ? 'completed' : ''}`;
            workoutEl.dataset.id = workout.id;
            
            workoutEl.innerHTML = `
                <div class="workout-header">
                    <h3 class="workout-title">${workout.name}</h3>
                </div>
                <p class="workout-description">${workout.description}</p>
                <div class="workout-actions">
                    <div class="checkbox-container">
                        <input type="checkbox" id="${workout.id}" ${workout.completed ? 'checked' : ''}>
                        <label for="${workout.id}">Completed</label>
                    </div>
                    <button class="accountability-btn">Why not?</button>
                </div>
                ${workout.consequence ? `<div class="consequence ${workout.consequence ? 'active' : ''}">
                    <strong>Consequence:</strong> ${workout.consequence}
                </div>` : ''}
            `;
            
            // Add event listener to the checkbox
            const checkbox = workoutEl.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', function() {
                console.log('Checkbox clicked for workout:', workout.id, 'New state:', this.checked);
                toggleWorkoutCompletion(personId, dateKey, workout.id, this.checked);
            });
            
            // Add event listener to the accountability button
            const accountabilityBtn = workoutEl.querySelector('.accountability-btn');
            accountabilityBtn.addEventListener('click', function() {
                console.log('Why not button clicked for workout:', workout.id);
                openAccountabilityModal(personId, dateKey, workout.id);
            });
            
            container.appendChild(workoutEl);
        }
        
        function toggleWorkoutCompletion(personId, dateKey, workoutId, isCompleted) {
            console.log('Toggling workout completion:', personId, dateKey, workoutId, isCompleted);
            
            // Find and update the workout
            if (!workoutData[personId]) {
                workoutData[personId] = {};
            }
            
            if (!workoutData[personId][dateKey]) {
                workoutData[personId][dateKey] = [];
            }
            
            const workout = workoutData[personId][dateKey].find(w => w.id === workoutId);
            
            if (workout) {
                workout.completed = isCompleted;
                
                // If marked as completed, remove any consequence
                if (isCompleted) {
                    delete workout.consequence;
                }
                
                saveWorkoutData();
                
                // Update the UI immediately
                const workoutEl = document.querySelector(`.workout-item[data-id="${workoutId}"]`);
                if (workoutEl) {
                    if (isCompleted) {
                        workoutEl.classList.add('completed');
                        workoutEl.classList.remove('incomplete');
                    } else {
                        workoutEl.classList.remove('completed');
                        workoutEl.classList.add('incomplete');
                    }
                }
                
                // Save to cloud storage (we'll implement this next)
                saveToCloudStorage();
            }
        }
        
        function getWorkoutsForDate(personId, dateKey) {
            // If no data exists for this person/date, generate sample workouts
            if (!workoutData[personId] || !workoutData[personId][dateKey]) {
                const sampleWorkouts = generateSampleWorkouts(personId, dateKey);
                
                if (!workoutData[personId]) {
                    workoutData[personId] = {};
                }
                
                workoutData[personId][dateKey] = sampleWorkouts;
                saveWorkoutData();
            }
            
            return workoutData[personId][dateKey];
        }
        
        function generateSampleWorkouts(personId, dateKey) {
            // Get day of week (0-6, where 0 is Sunday)
            const dayOfWeek = new Date(dateKey).getDay();
            
            // Different workouts based on person and day of week
            const workouts = [];
            
            if (personId === 'person1') {
                // Person 1 workouts
                switch(dayOfWeek) {
                    case 0: // Sunday
                        workouts.push(
                            createWorkout('Rest Day', 'Take it easy today and recover.'),
                            createWorkout('Light Stretching', '15 minutes of full-body stretching.')
                        );
                        break;
                    case 1: // Monday
                        workouts.push(
                            createWorkout('Upper Body', '3 sets of 12 push-ups, 3 sets of 10 dumbbell rows.'),
                            createWorkout('Core Workout', '3 sets of 20 crunches, 3 sets of 30-second planks.')
                        );
                        break;
                    case 2: // Tuesday
                        workouts.push(
                            createWorkout('Cardio', '30 minutes of jogging or cycling.'),
                            createWorkout('HIIT', '15 minutes of high-intensity interval training.')
                        );
                        break;
                    case 3: // Wednesday
                        workouts.push(
                            createWorkout('Lower Body', '3 sets of 15 squats, 3 sets of 12 lunges per leg.'),
                            createWorkout('Glutes', '3 sets of 15 glute bridges, 3 sets of 12 donkey kicks per leg.')
                        );
                        break;
                    case 4: // Thursday
                        workouts.push(
                            createWorkout('Active Recovery', '30 minutes of walking or light yoga.'),
                            createWorkout('Mobility Work', '15 minutes of joint mobility exercises.')
                        );
                        break;
                    case 5: // Friday
                        workouts.push(
                            createWorkout('Full Body', '3 sets of 10 burpees, 3 sets of 12 dumbbell thrusters.'),
                            createWorkout('Core', '3 sets of 15 Russian twists, 3 sets of 10 leg raises.')
                        );
                        break;
                    case 6: // Saturday
                        workouts.push(
                            createWorkout('Cardio', '45 minutes of hiking or swimming.'),
                            createWorkout('Flexibility', '20 minutes of yoga or stretching.')
                        );
                        break;
                }
            } else {
                // Person 2 workouts
                switch(dayOfWeek) {
                    case 0: // Sunday
                        workouts.push(
                            createWorkout('Rest Day', 'Take it easy today and recover.'),
                            createWorkout('Mobility', '15 minutes of mobility exercises.')
                        );
                        break;
                    case 1: // Monday
                        workouts.push(
                            createWorkout('Chest & Triceps', '4 sets of 8 bench press, 3 sets of 10 tricep dips.'),
                            createWorkout('Shoulders', '3 sets of 10 overhead press, 3 sets of 12 lateral raises.')
                        );
                        break;
                    case 2: // Tuesday
                        workouts.push(
                            createWorkout('Cardio', '30 minutes of running or rowing.'),
                            createWorkout('Core', '3 sets of 20 mountain climbers, 3 sets of 45-second planks.')
                        );
                        break;
                    case 3: // Wednesday
                        workouts.push(
                            createWorkout('Back & Biceps', '4 sets of 8 pull-ups, 3 sets of 10 barbell curls.'),
                            createWorkout('Forearms', '3 sets of 15 wrist curls, 3 sets of 30-second hangs.')
                        );
                        break;
                    case 4: // Thursday
                        workouts.push(
                            createWorkout('Active Recovery', '30 minutes of swimming or cycling.'),
                            createWorkout('Stretching', '15 minutes of full-body stretching.')
                        );
                        break;
                    case 5: // Friday
                        workouts.push(
                            createWorkout('Legs', '4 sets of 8 squats, 3 sets of 10 deadlifts.'),
                            createWorkout('Calves', '3 sets of 15 calf raises, 3 sets of 20 jump rope intervals.')
                        );
                        break;
                    case 6: // Saturday
                        workouts.push(
                            createWorkout('Functional Training', '30 minutes of kettlebell exercises.'),
                            createWorkout('Abs', '3 sets of 15 hanging leg raises, 3 sets of 20 bicycle crunches.')
                        );
                        break;
                }
            }
            
            return workouts;
        }
        
        function createWorkout(name, description) {
            return {
                id: generateId(),
                name: name,
                description: description,
                completed: false
            };
        }
        
        function generateId() {
            return Math.random().toString(36).substr(2, 9);
        }
        
        function formatDate(date) {
            return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        }
        
        function loadWorkoutData() {
            try {
                const savedData = localStorage.getItem('coupleWorkoutData');
                return savedData ? JSON.parse(savedData) : { person1: {}, person2: {} };
            } catch (error) {
                console.error('Error loading workout data:', error);
                return { person1: {}, person2: {} };
            }
        }
        
        function saveWorkoutData() {
            // Save to localStorage
            localStorage.setItem('coupleWorkoutData', JSON.stringify(workoutData));
            
            // Save to cloud
            saveToCloudStorage();
        }
        
        // Settings functions
        function loadUserSettings() {
            const settings = JSON.parse(localStorage.getItem('coupleWorkoutSettings') || '{}');
            
            // Set default names if not set
            const person1Name = settings.person1Name || 'Your Name';
            const person2Name = settings.person2Name || 'Boyfriend\'s Name';
            
            // Update UI
            person1NameEl.textContent = person1Name;
            person2NameEl.textContent = person2Name;
            person1NameInput.value = person1Name;
            person2NameInput.value = person2Name;
        }
        
        function saveUserSettings() {
            const settings = {
                person1Name: person1NameInput.value || 'Your Name',
                person2Name: person2NameInput.value || 'Boyfriend\'s Name'
            };
            
            localStorage.setItem('coupleWorkoutSettings', JSON.stringify(settings));
            
            // Update UI
            person1NameEl.textContent = settings.person1Name;
            person2NameEl.textContent = settings.person2Name;
            
            closeSettingsModal();
        }
        
        function openSettingsModal() {
            settingsModal.style.display = 'block';
        }
        
        function closeSettingsModal() {
            settingsModal.style.display = 'none';
        }
        
        // Accountability functions
        function openAccountabilityModal(personId, dateKey, workoutId) {
            // Reset the form
            reasonSelect.value = '';
            otherReasonText.value = '';
            otherReasonText.style.display = 'none';
            consequenceDiv.style.display = 'none';
            
            // Store the current workout for later use
            currentWorkoutForAccountability = { personId, dateKey, workoutId };
            
            // Highlight the workout item in red
            const workoutEl = document.querySelector(`.workout-item[data-id="${workoutId}"]`);
            if (workoutEl) {
                workoutEl.classList.add('incomplete');
            }
            
            // Show the modal
            accountabilityModal.style.display = 'block';
        }
        
        function closeAccountabilityModal() {
            accountabilityModal.style.display = 'none';
            currentWorkoutForAccountability = null;
        }
        
        function handleReasonChange() {
            if (reasonSelect.value === 'other') {
                otherReasonText.style.display = 'block';
            } else {
                otherReasonText.style.display = 'none';
                
                if (reasonSelect.value) {
                    // Generate consequence based on reason
                    const consequence = generateConsequence(reasonSelect.value);
                    consequenceText.textContent = consequence;
                    consequenceDiv.style.display = 'block';
                } else {
                    consequenceDiv.style.display = 'none';
                }
            }
        }
        
        function submitAccountabilityReason() {
            if (!currentWorkoutForAccountability) return;
            
            const { personId, dateKey, workoutId } = currentWorkoutForAccountability;
            
            // Get the reason
            let reason = reasonSelect.value;
            if (reason === 'other') {
                reason = otherReasonText.value;
            }
            
            if (!reason) {
                alert('Please select or enter a reason');
                return;
            }
            
            // Generate consequence
            const consequence = generateConsequence(reason);
            
            // Update the workout with the consequence
            if (workoutData[personId] && workoutData[personId][dateKey]) {
                const workout = workoutData[personId][dateKey].find(w => w.id === workoutId);
                if (workout) {
                    workout.consequence = consequence;
                    workout.reason = reason;
                    workout.incomplete = true; // Mark as explicitly incomplete
                    
                    saveWorkoutData(); // This now also saves to cloud
                    renderWorkouts();
                }
            }
            
            closeAccountabilityModal();
        }
        
        function generateConsequence(reason) {
            // Different consequences based on the reason
            switch(reason) {
                case 'time':
                    return 'Wake up 30 minutes earlier tomorrow to make time for your workout.';
                case 'energy':
                    return 'Do a 10-minute light workout now and go to bed 1 hour earlier tonight.';
                case 'motivation':
                    return 'Do 50 jumping jacks right now and schedule tomorrow\'s workout with a friend.';
                case 'injury':
                    return 'Rest the injured area, but do a modified workout that doesn\'t involve that body part.';
                case 'other':
                    return 'Add an extra 15 minutes to your next workout session.';
                default:
                    return 'Do 20 burpees as a penalty and don\'t skip your next workout!';
            }
        }
        
        // Close modals when clicking outside
        window.onclick = function(event) {
            if (event.target === settingsModal) {
                closeSettingsModal();
            }
            if (event.target === accountabilityModal) {
                closeAccountabilityModal();
            }
        };

        // Add this function to check if localStorage is available
        function isLocalStorageAvailable() {
            try {
                const test = 'test';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        }

        // Use this check before trying to use localStorage
        if (!isLocalStorageAvailable()) {
            alert('Your browser does not support or has disabled local storage. The app may not work properly.');
        }

        // Generate a random share code
        function generateShareCode() {
            return Math.random().toString(36).substring(2, 10);
        }

        // Show share link to the user
        function showShareLink(url) {
            const shareDiv = document.createElement('div');
            shareDiv.className = 'share-link';
            shareDiv.innerHTML = `
                <p>Share this link with your boyfriend to sync your workout data:</p>
                <div class="share-url">
                    <input type="text" value="${url}" readonly>
                    <button id="copyShareLink">Copy</button>
                </div>
            `;
            
            document.querySelector('.container').insertBefore(shareDiv, document.querySelector('main'));
            
            // Add copy functionality
            document.getElementById('copyShareLink').addEventListener('click', function() {
                const shareInput = shareDiv.querySelector('input');
                shareInput.select();
                document.execCommand('copy');
                this.textContent = 'Copied!';
                setTimeout(() => {
                    this.textContent = 'Copy';
                }, 2000);
            });
        }

        // Save data to Firebase
        function saveToCloudStorage() {
            if (workoutRef) {
                workoutRef.set(workoutData)
                    .then(() => {
                        console.log('Data saved to cloud successfully');
                    })
                    .catch((error) => {
                        console.error('Error saving to cloud:', error);
                    });
            }
        }

        // Load data from Firebase
        function loadFromCloudStorage() {
            if (workoutRef) {
                workoutRef.once('value')
                    .then((snapshot) => {
                        const cloudData = snapshot.val();
                        if (cloudData) {
                            workoutData = cloudData;
                            renderWorkouts();
                            console.log('Data loaded from cloud successfully');
                        }
                    })
                    .catch((error) => {
                        console.error('Error loading from cloud:', error);
                    });
            }
        }
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Error initializing app: ' + error.message);
    }
}); 