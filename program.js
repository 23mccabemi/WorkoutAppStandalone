// BigMike: the exercise library and the default 6-day push / pull / legs program.
// Muscle credit: 1 for the main target, 0.5 for muscles it trains secondarily.

window.BM_MUSCLES = ["Chest", "Back", "Side delts", "Rear delts", "Triceps", "Biceps", "Quads", "Hamstrings", "Glutes", "Calves", "Abs"];

window.BM_EX = {
  // ---------------- push ----------------
  bench_bb: {
    name: "Barbell Bench Press", equip: "barbell", muscles: { Chest: 1, Triceps: 0.5 },
    howto: {
      setup: "Lie on the bench with your eyes under the bar. Feet flat, shoulder blades pinched together and down.",
      steps: ["Unrack with straight arms over your shoulders.", "Lower the bar to your lower chest, elbows about 45° from your sides.", "Press up and slightly back toward your face."],
      cue: "Keep your shoulder blades squeezed the whole set.",
      mistake: "Bouncing the bar off your chest or flaring elbows straight out.",
    },
    alts: ["db_bench", "machine_chest_press", "smith_bench"],
  },
  db_bench: {
    name: "Flat Dumbbell Press", equip: "dumbbell", muscles: { Chest: 1, Triceps: 0.5 },
    howto: {
      setup: "Sit with dumbbells on your thighs, lie back and bring them up over your chest.",
      steps: ["Lower until the dumbbells are beside your chest and you feel a stretch.", "Press up and slightly in."],
      cue: "Go deeper than a barbell allows, but stay in control.",
      mistake: "Clanging the dumbbells together at the top (it takes tension off).",
    },
    alts: ["bench_bb", "machine_chest_press"],
  },
  smith_bench: {
    name: "Smith Machine Bench Press", equip: "machine", muscles: { Chest: 1, Triceps: 0.5 },
    howto: {
      setup: "Set the bench so the bar lands on your lower chest.",
      steps: ["Unhook by twisting the bar.", "Lower to your chest, press back up."],
      cue: "Set the safety stops just below chest height.",
      mistake: "Lining up so the bar lands on your neck or belly.",
    },
    alts: ["bench_bb", "db_bench"],
  },
  incline_db: {
    name: "Incline Dumbbell Press", equip: "dumbbell", muscles: { Chest: 1, Triceps: 0.5 },
    howto: {
      setup: "Bench at about 30°. Dumbbells start at your shoulders.",
      steps: ["Press up over your upper chest.", "Lower slowly until you feel a stretch across your chest."],
      cue: "Upper chest, not shoulders: keep the incline low.",
      mistake: "Setting the bench too steep, which turns it into a shoulder press.",
    },
    alts: ["incline_smith", "machine_chest_press", "db_bench"],
  },
  incline_smith: {
    name: "Incline Smith Press", equip: "machine", muscles: { Chest: 1, Triceps: 0.5 },
    howto: {
      setup: "Bench at about 30° in the Smith machine, bar over your upper chest.",
      steps: ["Unhook, lower to your upper chest.", "Press back up."],
      cue: "Touch the same spot on your chest every rep.",
      mistake: "Bench too far forward or back, so the bar path feels awkward.",
    },
    alts: ["incline_db", "machine_chest_press"],
  },
  machine_chest_press: {
    name: "Machine Chest Press", equip: "machine", muscles: { Chest: 1, Triceps: 0.5 },
    howto: {
      setup: "Adjust the seat so the handles line up with the middle of your chest.",
      steps: ["Press the handles forward until your arms are almost straight.", "Let them come back until you feel a stretch."],
      cue: "Chest up, shoulders back against the pad.",
      mistake: "Cutting the stretch short at the back of each rep.",
    },
    alts: ["db_bench", "pec_deck"],
  },
  cable_fly_lowhigh: {
    name: "Low-to-High Cable Fly", equip: "cable", muscles: { Chest: 1 },
    howto: {
      setup: "Pulleys at the bottom. Step forward with a handle in each hand, arms down and slightly back.",
      steps: ["Sweep your hands up and together to about chin height.", "Lower slowly back to the stretch."],
      cue: "Slight bend in the elbows, and keep it fixed.",
      mistake: "Turning it into a press by bending the elbows more.",
    },
    alts: ["pec_deck", "cable_fly_mid"],
  },
  cable_fly_mid: {
    name: "Cable Fly", equip: "cable", muscles: { Chest: 1 },
    howto: {
      setup: "Pulleys at shoulder height. Step forward, arms open wide.",
      steps: ["Bring your hands together in front of your chest in a hugging arc.", "Open back up slowly to the stretch."],
      cue: "Think about squeezing your arms across your body.",
      mistake: "Leaning too far forward and using bodyweight.",
    },
    alts: ["pec_deck", "cable_fly_lowhigh"],
  },
  pec_deck: {
    name: "Pec Deck", equip: "machine", muscles: { Chest: 1 },
    howto: {
      setup: "Seat height so the handles are at chest level.",
      steps: ["Bring the handles together in front of you.", "Open back slowly until you feel a stretch."],
      cue: "Lead with your elbows, not your hands.",
      mistake: "Letting the weights slam at the back.",
    },
    alts: ["cable_fly_mid", "cable_fly_lowhigh"],
  },
  db_shoulder_press: {
    name: "Seated Dumbbell Shoulder Press", equip: "dumbbell", muscles: { "Side delts": 0.5, Triceps: 0.5, Chest: 0.25 },
    howto: {
      setup: "Bench upright. Dumbbells at shoulder height, palms forward.",
      steps: ["Press up until your arms are nearly straight.", "Lower back to ear level."],
      cue: "Ribs down, don't arch your lower back.",
      mistake: "Arching back so it becomes an incline press.",
    },
    alts: ["machine_shoulder_press", "smith_shoulder_press"],
  },
  machine_shoulder_press: {
    name: "Machine Shoulder Press", equip: "machine", muscles: { "Side delts": 0.5, Triceps: 0.5, Chest: 0.25 },
    howto: {
      setup: "Seat height so the handles start at shoulder level.",
      steps: ["Press up until your arms are nearly straight.", "Lower under control."],
      cue: "Back flat against the pad.",
      mistake: "Short reps that never come back down to shoulder level.",
    },
    alts: ["db_shoulder_press", "smith_shoulder_press"],
  },
  smith_shoulder_press: {
    name: "Smith Machine Shoulder Press", equip: "machine", muscles: { "Side delts": 0.5, Triceps: 0.5, Chest: 0.25 },
    howto: {
      setup: "Upright bench in the Smith machine, bar just in front of your face.",
      steps: ["Unhook, press up.", "Lower to about chin level."],
      cue: "Keep your head still and let the bar travel in front of it.",
      mistake: "Setting the bench too far back so the bar hits your face.",
    },
    alts: ["db_shoulder_press", "machine_shoulder_press"],
  },
  cable_lateral: {
    name: "Cable Lateral Raise", equip: "cable", muscles: { "Side delts": 1 },
    howto: {
      setup: "Pulley at the bottom. Stand side-on, handle in the far hand, cable behind you.",
      steps: ["Raise your arm out to the side to shoulder height.", "Lower slowly to the stretch."],
      cue: "Lead with your elbow, slight bend, pinky slightly up.",
      mistake: "Swinging your body to get the weight up.",
    },
    alts: ["db_lateral", "machine_lateral"],
  },
  db_lateral: {
    name: "Dumbbell Lateral Raise", equip: "dumbbell", muscles: { "Side delts": 1 },
    howto: {
      setup: "Stand tall, dumbbells at your sides, slight lean forward.",
      steps: ["Raise out to the sides to shoulder height.", "Lower for a slow 2 count."],
      cue: "Push the dumbbells out, not up.",
      mistake: "Shrugging your shoulders up toward your ears.",
    },
    alts: ["cable_lateral", "machine_lateral"],
  },
  machine_lateral: {
    name: "Machine Lateral Raise", equip: "machine", muscles: { "Side delts": 1 },
    howto: {
      setup: "Seat so your shoulders line up with the machine's pivot.",
      steps: ["Raise your arms out against the pads.", "Lower slowly."],
      cue: "Pause for a moment at the top.",
      mistake: "Seat too high or low, so the pads press in the wrong spot.",
    },
    alts: ["cable_lateral", "db_lateral"],
  },
  pushdown: {
    name: "Triceps Pushdown", equip: "cable", muscles: { Triceps: 1 },
    howto: {
      setup: "Pulley at the top with a rope or bar. Elbows tucked at your sides.",
      steps: ["Push down until your arms are straight.", "Let your hands come back up to chest height."],
      cue: "Only your forearms move. Elbows stay pinned.",
      mistake: "Leaning over the weight and using your shoulders.",
    },
    alts: ["oh_cable_tri", "assisted_dip"],
  },
  oh_cable_tri: {
    name: "Overhead Cable Triceps Extension", equip: "cable", muscles: { Triceps: 1 },
    howto: {
      setup: "Rope on a low or mid pulley. Turn away so the rope is behind your head, elbows pointing forward.",
      steps: ["Straighten your arms forward and up.", "Bend back slowly for a deep stretch behind your head."],
      cue: "Keep your elbows from flaring out.",
      mistake: "Short range: the stretch is the point of this one.",
    },
    alts: ["oh_db_tri", "pushdown"],
  },
  oh_db_tri: {
    name: "Overhead Dumbbell Triceps Extension", equip: "dumbbell", muscles: { Triceps: 1 },
    howto: {
      setup: "Sit tall, hold one dumbbell with both hands overhead.",
      steps: ["Lower it behind your head by bending your elbows.", "Straighten back up."],
      cue: "Elbows point forward and stay close to your head.",
      mistake: "Arching the lower back as the weight gets heavy.",
    },
    alts: ["oh_cable_tri", "skull_crusher"],
  },
  skull_crusher: {
    name: "EZ-Bar Skull Crusher", equip: "barbell", muscles: { Triceps: 1 },
    howto: {
      setup: "Lie on a flat bench, EZ bar held over your forehead with arms straight.",
      steps: ["Bend your elbows to lower the bar just behind your head.", "Straighten back up."],
      cue: "Upper arms tilted slightly back, not straight up.",
      mistake: "Letting the elbows flare wide.",
    },
    alts: ["oh_db_tri", "pushdown"],
  },
  assisted_dip: {
    name: "Assisted Dip", equip: "machine", muscles: { Triceps: 1, Chest: 0.5 },
    howto: {
      setup: "Kneel or stand on the assist pad. More assist weight makes it easier. Log the assist weight.",
      steps: ["Lower until your upper arms are about level with the floor.", "Push back up to straight arms."],
      cue: "Stay fairly upright for triceps.",
      mistake: "Dropping too deep and straining the front of the shoulders.",
    },
    alts: ["close_grip_bench", "pushdown"],
    assisted: true,
  },
  close_grip_bench: {
    name: "Close-Grip Bench Press", equip: "barbell", muscles: { Triceps: 1, Chest: 0.5 },
    howto: {
      setup: "Hands about shoulder-width on the bar.",
      steps: ["Lower to your lower chest, elbows close to your sides.", "Press up."],
      cue: "Shoulder-width grip, not closer. Wrists stay straight.",
      mistake: "Hands touching in the middle, which strains the wrists.",
    },
    alts: ["assisted_dip", "pushdown"],
  },

  // ---------------- pull ----------------
  lat_pulldown: {
    name: "Lat Pulldown", equip: "cable", muscles: { Back: 1, Biceps: 0.5 },
    howto: {
      setup: "Thighs under the pad, hands a bit wider than shoulders.",
      steps: ["Pull the bar to your upper chest, driving elbows down.", "Let it rise until your arms are straight and lats stretch."],
      cue: "Chest up, pull with your elbows.",
      mistake: "Leaning way back and turning it into a row.",
    },
    alts: ["neutral_pulldown", "assisted_pullup"],
  },
  neutral_pulldown: {
    name: "Neutral-Grip Pulldown", equip: "cable", muscles: { Back: 1, Biceps: 0.5 },
    howto: {
      setup: "Use the close parallel-grip handle.",
      steps: ["Pull the handle to your upper chest.", "Return to a full stretch overhead."],
      cue: "Elbows down and back, close to your sides.",
      mistake: "Rounding forward at the bottom.",
    },
    alts: ["lat_pulldown", "assisted_pullup"],
  },
  assisted_pullup: {
    name: "Assisted Pull-Up", equip: "machine", muscles: { Back: 1, Biceps: 0.5 },
    howto: {
      setup: "Kneel on the pad. More assist weight makes it easier. Log the assist weight; progress means less assist.",
      steps: ["Pull until your chin clears the bar.", "Lower all the way to straight arms."],
      cue: "Shoulders down first, then pull.",
      mistake: "Half reps that never straighten the arms.",
    },
    alts: ["neutral_pulldown", "lat_pulldown"],
    assisted: true,
  },
  cs_row: {
    name: "Chest-Supported Row", equip: "machine", muscles: { Back: 1, "Rear delts": 0.5, Biceps: 0.5 },
    howto: {
      setup: "Chest against the pad, feet planted.",
      steps: ["Row the handles back until your elbows pass your body.", "Reach forward fully for the stretch."],
      cue: "Squeeze your shoulder blades together at the back.",
      mistake: "Lifting your chest off the pad to cheat the weight up.",
    },
    alts: ["machine_row", "sa_db_row", "seated_cable_row"],
  },
  machine_row: {
    name: "Machine Row", equip: "machine", muscles: { Back: 1, "Rear delts": 0.5, Biceps: 0.5 },
    howto: {
      setup: "Seat so the handles are at mid-chest height.",
      steps: ["Pull the handles to your sides.", "Let them go forward to a full stretch."],
      cue: "Pull with your elbows, not your hands.",
      mistake: "Shrugging up as you pull.",
    },
    alts: ["cs_row", "seated_cable_row"],
  },
  seated_cable_row: {
    name: "Seated Cable Row", equip: "cable", muscles: { Back: 1, Biceps: 0.5 },
    howto: {
      setup: "Feet on the platform, knees soft, close-grip handle.",
      steps: ["Pull the handle to your belly button.", "Reach forward, letting your shoulders stretch."],
      cue: "Sit tall at the end of each rep.",
      mistake: "Rocking your whole torso back and forth.",
    },
    alts: ["cs_row", "machine_row"],
  },
  sa_db_row: {
    name: "Single-Arm Dumbbell Row", equip: "dumbbell", muscles: { Back: 1, Biceps: 0.5 },
    howto: {
      setup: "One knee and hand on a bench, back flat, dumbbell hanging.",
      steps: ["Row the dumbbell toward your hip.", "Lower to a full stretch."],
      cue: "Think elbow to back pocket.",
      mistake: "Twisting the torso to heave it up.",
    },
    alts: ["cs_row", "machine_row"],
  },
  straight_arm_pulldown: {
    name: "Straight-Arm Pulldown", equip: "cable", muscles: { Back: 1 },
    howto: {
      setup: "High pulley, rope or bar. Step back, hinge slightly, arms straight.",
      steps: ["Sweep your hands down to your thighs.", "Let them rise back to about head height."],
      cue: "Arms stay straight; feel it in your lats.",
      mistake: "Bending the elbows so it becomes a pushdown.",
    },
    alts: ["lat_pulldown", "neutral_pulldown"],
  },
  face_pull: {
    name: "Face Pull", equip: "cable", muscles: { "Rear delts": 1 },
    howto: {
      setup: "Rope at upper-chest to forehead height.",
      steps: ["Pull the rope toward your forehead, hands spreading apart.", "Return slowly."],
      cue: "Elbows high, finish with your hands beside your ears.",
      mistake: "Using too much weight and leaning back.",
    },
    alts: ["reverse_pec_deck", "rear_delt_fly"],
  },
  reverse_pec_deck: {
    name: "Reverse Pec Deck", equip: "machine", muscles: { "Rear delts": 1 },
    howto: {
      setup: "Face the pad, handles at shoulder height.",
      steps: ["Open your arms out and back.", "Return slowly."],
      cue: "Small bend in the elbows, push out wide.",
      mistake: "Squeezing your shoulder blades hard (that shifts it to the upper back).",
    },
    alts: ["face_pull", "rear_delt_fly"],
  },
  rear_delt_fly: {
    name: "Bent-Over Dumbbell Rear Delt Fly", equip: "dumbbell", muscles: { "Rear delts": 1 },
    howto: {
      setup: "Hinge forward with a flat back, light dumbbells hanging.",
      steps: ["Raise them out to the sides.", "Lower slowly."],
      cue: "Pinkies lead, arms wide.",
      mistake: "Going heavy and swinging.",
    },
    alts: ["reverse_pec_deck", "face_pull"],
  },
  incline_db_curl: {
    name: "Incline Dumbbell Curl", equip: "dumbbell", muscles: { Biceps: 1 },
    howto: {
      setup: "Bench at about 45°, lie back with arms hanging straight down.",
      steps: ["Curl up without moving your upper arms.", "Lower all the way for the stretch."],
      cue: "Elbows stay pointing at the floor.",
      mistake: "Swinging the elbows forward to finish the rep.",
    },
    alts: ["db_curl", "cable_curl"],
  },
  db_curl: {
    name: "Dumbbell Curl", equip: "dumbbell", muscles: { Biceps: 1 },
    howto: {
      setup: "Stand tall, dumbbells at your sides.",
      steps: ["Curl up, turning palms up as you go.", "Lower slowly."],
      cue: "No swinging: elbows stay still.",
      mistake: "Rocking your hips to get the weight moving.",
    },
    alts: ["cable_curl", "hammer_curl"],
  },
  hammer_curl: {
    name: "Hammer Curl", equip: "dumbbell", muscles: { Biceps: 1 },
    howto: {
      setup: "Palms facing your sides.",
      steps: ["Curl up keeping palms facing in.", "Lower slowly."],
      cue: "Thumbs up the whole time.",
      mistake: "Rushing the lowering part.",
    },
    alts: ["db_curl", "cable_curl"],
  },
  cable_curl: {
    name: "Cable Curl", equip: "cable", muscles: { Biceps: 1 },
    howto: {
      setup: "Low pulley, bar or rope, stand close.",
      steps: ["Curl up to your shoulders.", "Lower until your arms are straight."],
      cue: "Tension stays on at the bottom, unlike dumbbells.",
      mistake: "Elbows drifting forward.",
    },
    alts: ["db_curl", "preacher_curl"],
  },
  preacher_curl: {
    name: "Preacher Curl", equip: "machine", muscles: { Biceps: 1 },
    howto: {
      setup: "Armpits snug against the top of the pad.",
      steps: ["Curl up.", "Lower until your arms are almost straight."],
      cue: "Control the bottom; that's where it works hardest.",
      mistake: "Lifting your elbows off the pad.",
    },
    alts: ["cable_curl", "db_curl"],
  },
  cable_crunch: {
    name: "Cable Crunch", equip: "cable", muscles: { Abs: 1 },
    howto: {
      setup: "Kneel facing a high pulley, rope held beside your head.",
      steps: ["Curl your ribs toward your hips.", "Return slowly."],
      cue: "Round your spine; your hips stay still.",
      mistake: "Sitting back and pulling with the arms.",
    },
    alts: ["ab_crunch_machine", "hanging_knee_raise"],
  },
  ab_crunch_machine: {
    name: "Ab Crunch Machine", equip: "machine", muscles: { Abs: 1 },
    howto: {
      setup: "Adjust so the pads sit on your upper chest or handles at your shoulders.",
      steps: ["Crunch forward.", "Return slowly."],
      cue: "Exhale hard as you crunch.",
      mistake: "Pulling with the arms instead of the abs.",
    },
    alts: ["cable_crunch", "hanging_knee_raise"],
  },
  hanging_knee_raise: {
    name: "Hanging Knee Raise", equip: "bodyweight", muscles: { Abs: 1 },
    howto: {
      setup: "Hang from a bar or use the captain's chair. Log 0 lb.",
      steps: ["Bring your knees up toward your chest, curling your hips.", "Lower slowly without swinging."],
      cue: "Tilt your pelvis up at the top.",
      mistake: "Swinging the legs with momentum.",
    },
    alts: ["cable_crunch", "ab_crunch_machine"],
  },

  // ---------------- legs ----------------
  back_squat: {
    name: "Back Squat", equip: "barbell", muscles: { Quads: 1, Glutes: 0.5 },
    howto: {
      setup: "Bar on your upper back, feet about shoulder-width, toes slightly out.",
      steps: ["Brace your core, then sit down between your heels.", "Go as deep as you can with a flat back.", "Drive up through your whole foot."],
      cue: "Knees follow your toes.",
      mistake: "Knees caving in or heels lifting.",
    },
    alts: ["hack_squat", "smith_squat", "leg_press"],
  },
  hack_squat: {
    name: "Hack Squat", equip: "machine", muscles: { Quads: 1, Glutes: 0.5 },
    howto: {
      setup: "Back flat on the pad, feet shoulder-width in the middle of the platform.",
      steps: ["Release the handles and lower as deep as you can.", "Press back up without locking your knees hard."],
      cue: "Control the bottom, then drive.",
      mistake: "Stopping at a quarter squat.",
    },
    alts: ["back_squat", "smith_squat", "leg_press"],
  },
  smith_squat: {
    name: "Smith Machine Squat", equip: "machine", muscles: { Quads: 1, Glutes: 0.5 },
    howto: {
      setup: "Bar on your upper back, feet slightly in front of the bar.",
      steps: ["Sit down deep.", "Stand back up."],
      cue: "Feet a little forward lets you stay upright.",
      mistake: "Feet directly under the bar, which pushes your knees too far forward.",
    },
    alts: ["back_squat", "hack_squat"],
  },
  leg_press: {
    name: "Leg Press", equip: "machine", muscles: { Quads: 1, Glutes: 0.5 },
    howto: {
      setup: "Feet shoulder-width in the middle of the platform.",
      steps: ["Lower until your knees are near your chest.", "Press back up, stopping just short of locking out."],
      cue: "Lower back stays on the pad.",
      mistake: "Going so deep your hips curl off the seat.",
    },
    alts: ["hack_squat", "smith_squat"],
  },
  leg_ext: {
    name: "Leg Extension", equip: "machine", muscles: { Quads: 1 },
    howto: {
      setup: "Knees line up with the machine's pivot, pad on your lower shins.",
      steps: ["Straighten your legs.", "Lower slowly."],
      cue: "Squeeze for a moment at the top.",
      mistake: "Kicking up fast and letting it drop.",
    },
    alts: ["bss", "leg_press"],
  },
  rdl: {
    name: "Romanian Deadlift", equip: "barbell", muscles: { Hamstrings: 1, Glutes: 0.5 },
    howto: {
      setup: "Hold the bar at your hips, feet hip-width, knees soft.",
      steps: ["Push your hips back and slide the bar down your thighs.", "Stop when you feel a strong hamstring stretch (around mid-shin).", "Stand up by driving your hips forward."],
      cue: "Bar stays touching your legs, back stays flat.",
      mistake: "Rounding your back or bending your knees into a squat.",
    },
    alts: ["db_rdl", "back_ext_45"],
  },
  db_rdl: {
    name: "Dumbbell Romanian Deadlift", equip: "dumbbell", muscles: { Hamstrings: 1, Glutes: 0.5 },
    howto: {
      setup: "Dumbbells in front of your thighs, knees soft.",
      steps: ["Hips back, dumbbells slide down your legs.", "Stand up by squeezing your glutes."],
      cue: "Hips go back, not down.",
      mistake: "Letting the dumbbells drift away from your legs.",
    },
    alts: ["rdl", "back_ext_45"],
  },
  seated_leg_curl: {
    name: "Seated Leg Curl", equip: "machine", muscles: { Hamstrings: 1 },
    howto: {
      setup: "Knees at the pivot, thigh pad snug.",
      steps: ["Curl your heels down and under.", "Let them come back up slowly."],
      cue: "Lean your torso slightly forward for a bigger stretch.",
      mistake: "Fast reps with no control on the way up.",
    },
    alts: ["lying_leg_curl"],
  },
  lying_leg_curl: {
    name: "Lying Leg Curl", equip: "machine", muscles: { Hamstrings: 1 },
    howto: {
      setup: "Lie face down, knees just off the pad, ankles under the roller.",
      steps: ["Curl your heels toward your glutes.", "Lower slowly."],
      cue: "Hips stay pressed into the pad.",
      mistake: "Hips popping up to help.",
    },
    alts: ["seated_leg_curl"],
  },
  hip_thrust: {
    name: "Hip Thrust", equip: "barbell", muscles: { Glutes: 1, Hamstrings: 0.25 },
    howto: {
      setup: "Upper back on a bench, bar over your hips with a pad. Feet flat, about hip-width.",
      steps: ["Drive your hips up until your body is flat from knees to shoulders.", "Pause, then lower."],
      cue: "Chin tucked, squeeze your glutes hard at the top.",
      mistake: "Arching your lower back instead of finishing with the glutes.",
    },
    alts: ["machine_hip_thrust", "glute_bridge_smith"],
  },
  machine_hip_thrust: {
    name: "Machine Hip Thrust", equip: "machine", muscles: { Glutes: 1, Hamstrings: 0.25 },
    howto: {
      setup: "Back against the pad, belt or pad across your hips.",
      steps: ["Drive your hips up.", "Lower under control."],
      cue: "Pause and squeeze at the top.",
      mistake: "Pushing through the toes instead of the heels.",
    },
    alts: ["hip_thrust", "glute_bridge_smith"],
  },
  glute_bridge_smith: {
    name: "Smith Machine Hip Thrust", equip: "machine", muscles: { Glutes: 1, Hamstrings: 0.25 },
    howto: {
      setup: "Bench behind you, Smith bar over your hips with a pad.",
      steps: ["Drive your hips up to flat.", "Lower slowly."],
      cue: "Shins vertical at the top.",
      mistake: "Feet too far out, which shifts it to the hamstrings.",
    },
    alts: ["hip_thrust", "machine_hip_thrust"],
  },
  bss: {
    name: "Bulgarian Split Squat", equip: "dumbbell", muscles: { Quads: 1, Glutes: 1 },
    howto: {
      setup: "Back foot on a bench behind you, front foot about two feet forward. Dumbbells at your sides. Weight is per dumbbell.",
      steps: ["Lower straight down until your back knee nearly touches the floor.", "Drive up through your front foot. Do all reps, then switch legs."],
      cue: "Lean slightly forward for more glutes, stay upright for more quads.",
      mistake: "Front foot too close, which pushes the knee way past the toes.",
    },
    alts: ["walking_lunge", "leg_press"],
  },
  walking_lunge: {
    name: "Walking Lunge", equip: "dumbbell", muscles: { Quads: 1, Glutes: 1 },
    howto: {
      setup: "Dumbbells at your sides. Weight is per dumbbell. Count reps per leg.",
      steps: ["Step forward and lower your back knee toward the floor.", "Push through the front foot into the next step."],
      cue: "Long steps for glutes.",
      mistake: "Short choppy steps.",
    },
    alts: ["bss", "leg_press"],
  },
  back_ext_45: {
    name: "45° Back Extension", equip: "bodyweight", muscles: { Glutes: 1, Hamstrings: 0.5 },
    howto: {
      setup: "Pad just below your hip bones. Hold a plate for weight once it's easy (log the plate).",
      steps: ["Round slightly and lower forward.", "Rise up by squeezing your glutes until your body is straight."],
      cue: "Toes slightly out, push your hips into the pad.",
      mistake: "Hyperextending past straight at the top.",
    },
    alts: ["rdl", "db_rdl"],
  },
  hip_abduction: {
    name: "Hip Abduction Machine", equip: "machine", muscles: { Glutes: 1 },
    howto: {
      setup: "Sit with pads on the outside of your knees.",
      steps: ["Push your knees out as far as you can.", "Return slowly."],
      cue: "Lean slightly forward to hit the upper glutes more.",
      mistake: "Letting the weights crash between reps.",
    },
    alts: ["cable_abduction"],
  },
  cable_abduction: {
    name: "Cable Hip Abduction", equip: "cable", muscles: { Glutes: 1 },
    howto: {
      setup: "Ankle strap on a low pulley, stand side-on with the strap on the far leg.",
      steps: ["Swing your leg out to the side.", "Return slowly. Do all reps, then switch."],
      cue: "Keep your torso still.",
      mistake: "Leaning hard to the side.",
    },
    alts: ["hip_abduction"],
  },
  standing_calf: {
    name: "Standing Calf Raise", equip: "machine", muscles: { Calves: 1 },
    howto: {
      setup: "Balls of your feet on the edge, shoulders under the pads.",
      steps: ["Lower your heels as far as they go and pause.", "Rise up onto your toes."],
      cue: "Pause 1 to 2 seconds in the bottom stretch.",
      mistake: "Bouncing through short reps.",
    },
    alts: ["leg_press_calf", "seated_calf"],
  },
  seated_calf: {
    name: "Seated Calf Raise", equip: "machine", muscles: { Calves: 1 },
    howto: {
      setup: "Pad on your lower thighs, balls of your feet on the edge.",
      steps: ["Lower your heels for a full stretch.", "Push up onto your toes."],
      cue: "Slow and full range.",
      mistake: "Half reps.",
    },
    alts: ["standing_calf", "leg_press_calf"],
  },
  leg_press_calf: {
    name: "Leg Press Calf Raise", equip: "machine", muscles: { Calves: 1 },
    howto: {
      setup: "On the leg press, balls of your feet on the bottom edge, legs straight.",
      steps: ["Let your toes come back toward you.", "Press through your toes."],
      cue: "Keep the safety handles engaged.",
      mistake: "Bending your knees to help.",
    },
    alts: ["standing_calf", "seated_calf"],
  },
};

// The program. sets × min-max reps, rest in seconds. The first lift of each day rests longer.
const E = (ex, sets, min, max, rest) => ({ ex, sets, min, max, rest });
window.BM_DAYS = [
  { id: "push_a", name: "Push A", items: [
    E("bench_bb", 3, 6, 10, 150), E("incline_db", 3, 8, 12, 120), E("db_shoulder_press", 3, 8, 12, 120),
    E("cable_lateral", 4, 12, 20, 75), E("pushdown", 3, 10, 15, 75), E("oh_cable_tri", 2, 10, 15, 75),
  ] },
  { id: "pull_a", name: "Pull A", items: [
    E("lat_pulldown", 3, 8, 12, 120), E("cs_row", 3, 8, 12, 120), E("seated_cable_row", 2, 10, 15, 90),
    E("face_pull", 3, 12, 20, 75), E("incline_db_curl", 3, 10, 15, 75), E("ab_crunch_machine", 3, 10, 15, 60),
  ] },
  { id: "legs_a", name: "Legs A", sub: "Quad focus", items: [
    E("hack_squat", 3, 6, 10, 150), E("rdl", 3, 8, 12, 120), E("leg_press", 3, 10, 15, 120),
    E("leg_ext", 3, 10, 15, 75), E("seated_leg_curl", 3, 10, 15, 75), E("standing_calf", 3, 10, 15, 60),
  ] },
  { id: "push_b", name: "Push B", items: [
    E("machine_chest_press", 3, 8, 12, 120), E("cable_fly_lowhigh", 3, 10, 15, 90), E("machine_shoulder_press", 3, 8, 12, 120),
    E("db_lateral", 3, 12, 20, 75), E("assisted_dip", 3, 8, 12, 90), E("oh_db_tri", 2, 10, 15, 75),
  ] },
  { id: "pull_b", name: "Pull B", items: [
    E("assisted_pullup", 3, 6, 10, 120), E("sa_db_row", 3, 8, 12, 90), E("straight_arm_pulldown", 2, 12, 15, 75),
    E("reverse_pec_deck", 3, 12, 20, 60), E("cable_curl", 3, 10, 15, 60), E("hanging_knee_raise", 3, 10, 15, 60),
  ] },
  { id: "legs_b", name: "Legs B", sub: "Glutes & hamstrings", items: [
    E("hip_thrust", 3, 8, 12, 150), E("bss", 3, 8, 12, 90), E("lying_leg_curl", 3, 10, 15, 75),
    E("back_ext_45", 3, 10, 15, 75), E("hip_abduction", 3, 12, 20, 60), E("seated_calf", 3, 12, 20, 60),
  ] },
];

// The main lifts shown on the Progress screen.
window.BM_MAIN = ["bench_bb", "incline_db", "hack_squat", "rdl", "hip_thrust", "lat_pulldown", "db_shoulder_press", "cs_row"];
