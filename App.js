import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  TextInput,
  Switch,
  Alert,
  Picker
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  // State variables
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workoutData, setWorkoutData] = useState({ person1: {}, person2: {} });
  const [settings, setSettings] = useState({
    person1Name: 'Your Name',
    person2Name: 'Boyfriend\'s Name'
  });
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [accountabilityModalVisible, setAccountabilityModalVisible] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [consequence, setConsequence] = useState('');

  // Load data from storage when app starts
  useEffect(() => {
    loadData();
  }, []);

  // Load workout data and settings from AsyncStorage
  const loadData = async () => {
    try {
      const storedWorkoutData = await AsyncStorage.getItem('workoutData');
      const storedSettings = await AsyncStorage.getItem('settings');
      
      if (storedWorkoutData) {
        setWorkoutData(JSON.parse(storedWorkoutData));
      }
      
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Save workout data to AsyncStorage
  const saveWorkoutData = async (data) => {
    try {
      await AsyncStorage.setItem('workoutData', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving workout data:', error);
    }
  };

  // Save settings to AsyncStorage
  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Format date as YYYY-MM-DD
  const formatDate = (date) => {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  };

  // Navigate to previous or next day
  const navigateDay = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + offset);
    setCurrentDate(newDate);
  };

  // Toggle workout completion status
  const toggleWorkoutCompletion = (personId, workoutId) => {
    const dateKey = formatDate(currentDate);
    const newWorkoutData = { ...workoutData };
    
    if (!newWorkoutData[personId]) {
      newWorkoutData[personId] = {};
    }
    
    if (!newWorkoutData[personId][dateKey]) {
      newWorkoutData[personId][dateKey] = getWorkoutsForDate(personId, dateKey);
    }
    
    const workout = newWorkoutData[personId][dateKey].find(w => w.id === workoutId);
    
    if (workout) {
      workout.completed = !workout.completed;
      
      // If marked as completed, remove any consequence
      if (workout.completed) {
        delete workout.consequence;
      }
      
      setWorkoutData(newWorkoutData);
      saveWorkoutData(newWorkoutData);
    }
  };

  // Open accountability modal
  const openAccountabilityModal = (personId, workoutId) => {
    setCurrentWorkout({ personId, workoutId });
    setReason('');
    setOtherReason('');
    setConsequence('');
    setAccountabilityModalVisible(true);
  };

  // Submit accountability reason and set consequence
  const submitAccountabilityReason = () => {
    if (!currentWorkout) return;
    
    const { personId, workoutId } = currentWorkout;
    const dateKey = formatDate(currentDate);
    const newWorkoutData = { ...workoutData };
    
    // Get the reason
    let finalReason = reason;
    if (reason === 'other') {
      finalReason = otherReason;
    }
    
    if (!finalReason) {
      Alert.alert('Error', 'Please select or enter a reason');
      return;
    }
    
    // Generate consequence
    const generatedConsequence = generateConsequence(reason);
    setConsequence(generatedConsequence);
    
    // Update the workout with the consequence
    if (newWorkoutData[personId] && newWorkoutData[personId][dateKey]) {
      const workout = newWorkoutData[personId][dateKey].find(w => w.id === workoutId);
      if (workout) {
        workout.consequence = generatedConsequence;
        setWorkoutData(newWorkoutData);
        saveWorkoutData(newWorkoutData);
      }
    }
    
    setAccountabilityModalVisible(false);
  };

  // Generate a consequence based on the reason
  const generateConsequence = (reason) => {
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
  };

  // Get workouts for a specific date and person
  const getWorkoutsForDate = (personId, dateKey) => {
    // If workouts exist for this date, return them
    if (workoutData[personId] && workoutData[personId][dateKey]) {
      return workoutData[personId][dateKey];
    }
    
    // Otherwise, generate sample workouts
    return generateSampleWorkouts(personId, new Date(dateKey));
  };

  // Generate sample workouts based on day of week
  const generateSampleWorkouts = (personId, date) => {
    const dayOfWeek = date.getDay();
    const workouts = [];
    const generateId = () => Math.random().toString(36).substr(2, 9);
    
    if (personId === 'person1') {
      // Person 1 workouts
      switch(dayOfWeek) {
        case 0: // Sunday
          workouts.push(
            { id: generateId(), name: 'Rest Day', description: 'Take it easy today and recover.', completed: false },
            { id: generateId(), name: 'Light Stretching', description: '15 minutes of full-body stretching.', completed: false }
          );
          break;
        case 1: // Monday
          workouts.push(
            { id: generateId(), name: 'Upper Body', description: '3 sets of 12 push-ups, 3 sets of 10 dumbbell rows.', completed: false },
            { id: generateId(), name: 'Core Workout', description: '3 sets of 20 crunches, 3 sets of 30-second planks.', completed: false }
          );
          break;
        case 2: // Tuesday
          workouts.push(
            { id: generateId(), name: 'Cardio', description: '30 minutes of jogging or cycling.', completed: false },
            { id: generateId(), name: 'HIIT', description: '15 minutes of high-intensity interval training.', completed: false }
          );
          break;
        case 3: // Wednesday
          workouts.push(
            { id: generateId(), name: 'Lower Body', description: '3 sets of 15 squats, 3 sets of 12 lunges per leg.', completed: false },
            { id: generateId(), name: 'Glutes', description: '3 sets of 15 glute bridges, 3 sets of 12 donkey kicks per leg.', completed: false }
          );
          break;
        case 4: // Thursday
          workouts.push(
            { id: generateId(), name: 'Active Recovery', description: '30 minutes of walking or light yoga.', completed: false },
            { id: generateId(), name: 'Mobility Work', description: '15 minutes of joint mobility exercises.', completed: false }
          );
          break;
        case 5: // Friday
          workouts.push(
            { id: generateId(), name: 'Full Body', description: '3 sets of 10 burpees, 3 sets of 12 dumbbell thrusters.', completed: false },
            { id: generateId(), name: 'Core', description: '3 sets of 15 Russian twists, 3 sets of 10 leg raises.', completed: false }
          );
          break;
        case 6: // Saturday
          workouts.push(
            { id: generateId(), name: 'Cardio', description: '45 minutes of hiking or swimming.', completed: false },
            { id: generateId(), name: 'Flexibility', description: '20 minutes of yoga or stretching.', completed: false }
          );
          break;
      }
    } else {
      // Person 2 workouts
      switch(dayOfWeek) {
        case 0: // Sunday
          workouts.push(
            { id: generateId(), name: 'Rest Day', description: 'Take it easy today and recover.', completed: false },
            { id: generateId(), name: 'Mobility', description: '15 minutes of mobility exercises.', completed: false }
          );
          break;
        case 1: // Monday
          workouts.push(
            { id: generateId(), name: 'Chest & Triceps', description: '4 sets of 8 bench press, 3 sets of 10 tricep dips.', completed: false },
            { id: generateId(), name: 'Shoulders', description: '3 sets of 10 overhead press, 3 sets of 12 lateral raises.', completed: false }
          );
          break;
        case 2: // Tuesday
          workouts.push(
            { id: generateId(), name: 'Cardio', description: '30 minutes of running or rowing.', completed: false },
            { id: generateId(), name: 'Core', description: '3 sets of 20 mountain climbers, 3 sets of 45-second planks.', completed: false }
          );
          break;
        case 3: // Wednesday
          workouts.push(
            { id: generateId(), name: 'Back & Biceps', description: '4 sets of 8 pull-ups, 3 sets of 10 barbell curls.', completed: false },
            { id: generateId(), name: 'Forearms', description: '3 sets of 15 wrist curls, 3 sets of 30-second hangs.', completed: false }
          );
          break;
        case 4: // Thursday
          workouts.push(
            { id: generateId(), name: 'Active Recovery', description: '30 minutes of swimming or cycling.', completed: false },
            { id: generateId(), name: 'Stretching', description: '15 minutes of full-body stretching.', completed: false }
          );
          break;
        case 5: // Friday
          workouts.push(
            { id: generateId(), name: 'Legs', description: '4 sets of 8 squats, 3 sets of 10 deadlifts.', completed: false },
            { id: generateId(), name: 'Calves', description: '3 sets of 15 calf raises, 3 sets of 20 jump rope intervals.', completed: false }
          );
          break;
        case 6: // Saturday
          workouts.push(
            { id: generateId(), name: 'Functional Training', description: '30 minutes of kettlebell exercises.', completed: false },
            { id: generateId(), name: 'Abs', description: '3 sets of 15 hanging leg raises, 3 sets of 20 bicycle crunches.', completed: false }
          );
          break;
      }
    }
    
    return workouts;
  };

  // Render a workout item
  const renderWorkoutItem = (workout, personId) => {
    return (
      <View key={workout.id} style={[styles.workoutItem, workout.completed && styles.completedWorkout]}>
        <View style={styles.workoutHeader}>
          <Text style={styles.workoutTitle}>{workout.name}</Text>
        </View>
        <Text style={styles.workoutDescription}>{workout.description}</Text>
        <View style={styles.workoutActions}>
          <View style={styles.checkboxContainer}>
            <Switch
              value={workout.completed}
              onValueChange={() => toggleWorkoutCompletion(personId, workout.id)}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={workout.completed ? "#3498db" : "#f4f3f4"}
            />
            <Text style={styles.checkboxLabel}>Completed</Text>
          </View>
          {!workout.completed && (
            <TouchableOpacity 
              style={styles.accountabilityBtn}
              onPress={() => openAccountabilityModal(personId, workout.id)}
            >
              <Text style={styles.accountabilityBtnText}>Why not?</Text>
            </TouchableOpacity>
          )}
        </View>
        {workout.consequence && (
          <View style={styles.consequence}>
            <Text style={styles.consequenceText}>
              <Text style={styles.consequenceLabel}>Consequence: </Text>
              {workout.consequence}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Format date for display
  const formatDateForDisplay = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Get workouts for current date
  const dateKey = formatDate(currentDate);
  const person1Workouts = getWorkoutsForDate('person1', dateKey);
  const person2Workouts = getWorkoutsForDate('person2', dateKey);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Couple's Workout Tracker</Text>
        <View style={styles.dateNavigation}>
          <TouchableOpacity onPress={() => navigateDay(-1)}>
            <Ionicons name="chevron-back" size={24} color="#3498db" />
          </TouchableOpacity>
          <Text style={styles.dateText}>{formatDateForDisplay(currentDate)}</Text>
          <TouchableOpacity onPress={() => navigateDay(1)}>
            <Ionicons name="chevron-forward" size={24} color="#3498db" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.workoutColumns}>
          <View style={styles.workoutColumn}>
            <Text style={styles.columnTitle}>{settings.person1Name}</Text>
            {person1Workouts.length > 0 ? (
              person1Workouts.map(workout => renderWorkoutItem(workout, 'person1'))
            ) : (
              <Text style={styles.noWorkouts}>No workouts scheduled for today.</Text>
            )}
          </View>
          
          <View style={styles.workoutColumn}>
            <Text style={styles.columnTitle}>{settings.person2Name}</Text>
            {person2Workouts.length > 0 ? (
              person2Workouts.map(workout => renderWorkoutItem(workout, 'person2'))
            ) : (
              <Text style={styles.noWorkouts}>No workouts scheduled for today.</Text>
            )}
          </View>
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => setSettingsModalVisible(true)}
      >
        <Ionicons name="settings-outline" size={24} color="#7f8c8d" />
      </TouchableOpacity>
      
      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Your Name:</Text>
              <TextInput
                style={styles.input}
                value={settings.person1Name}
                onChangeText={(text) => setSettings({...settings, person1Name: text})}
                placeholder="Your Name"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Boyfriend's Name:</Text>
              <TextInput
                style={styles.input}
                value={settings.person2Name}
                onChangeText={(text) => setSettings({...settings, person2Name: text})}
                placeholder="Boyfriend's Name"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSettingsModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  saveSettings(settings);
                  setSettingsModalVisible(false);
                }}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Accountability Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={accountabilityModalVisible}
        onRequestClose={() => setAccountabilityModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Workout Not Completed</Text>
            <Text style={styles.modalSubtitle}>Why wasn't this workout completed?</Text>
            
            <Picker
              selectedValue={reason}
              style={styles.picker}
              onValueChange={(itemValue) => setReason(itemValue)}
            >
              <Picker.Item label="Select a reason..." value="" />
              <Picker.Item label="Not enough time" value="time" />
              <Picker.Item label="Too tired/low energy" value="energy" />
              <Picker.Item label="Lack of motivation" value="motivation" />
              <Picker.Item label="Injury or pain" value="injury" />
              <Picker.Item label="Other reason" value="other" />
            </Picker>
            
            {reason === 'other' && (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={otherReason}
                onChangeText={setOtherReason}
                placeholder="Please explain..."
                multiline={true}
                numberOfLines={4}
              />
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setAccountabilityModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={submitAccountabilityReason}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    marginHorizontal: 10,
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  workoutColumns: {
    flexDirection: 'column',
  },
  workoutColumn: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  workoutItem: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 5,
    backgroundColor: '#f8f9fa',
  },
  completedWorkout: {
    backgroundColor: '#d4edda',
  },
  workoutHeader: {
    marginBottom: 5,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  workoutDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  workoutActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  accountabilityBtn: {
    backgroundColor: '#e74c3c',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  accountabilityBtnText: {
    color: 'white',
    fontSize: 12,
  },
  consequence: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 5,
  },
  consequenceText: {
    fontSize: 14,
    color: '#856404',
  },
  consequenceLabel: {
    fontWeight: 'bold',
  },
  noWorkouts: {
    textAlign: 'center',
    color: '#7f8c8d',
    padding: 20,
  },
  settingsButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 10,
    borderRadius: 5,
  },
  textArea: {
    height: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 5,
  },
  saveButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  picker: {
    height: 50,
    width: '100%',
  },
}); 