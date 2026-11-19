import type { EncoreDB } from './db'
import { nameKey } from '../lib/text'
import {
  LANGUAGES,
  type Equipment,
  type Exercise,
  type MuscleGroup,
  type Translated,
} from './types'

type SeedExercise = {
  id: string
  names: Translated
  muscleGroup: MuscleGroup
  equipment: Equipment
}

/*
 * Exercícios iniciais, com o nome em português e em inglês.
 *
 * Os IDs são FIXOS de propósito (gerados uma vez e colados aqui). Se cada
 * aparelho sorteasse um UUID novo no seed, o "Supino reto" do celular e o do
 * computador teriam IDs diferentes e apareceriam duplicados após sincronizar.
 * Exercícios criados pelo usuário usam `crypto.randomUUID()` normalmente.
 *
 * Os nomes em inglês dos exercícios seguem o nome mais comum (ex.: "Bench Press"):
 * exercícios criados por um programa pronto com esse mesmo nome se reconhecem
 * como o mesmo exercício.
 */
// Um exercício por linha, como uma tabela (o Prettier quebraria em várias linhas):
// prettier-ignore
export const SEED_EXERCISES_V1: readonly SeedExercise[] = [
  // Peito
  { id: 'd583a392-b227-4970-a6ff-07c929916fd3', names: { pt: 'Supino reto com barra', en: 'Bench Press' }, muscleGroup: 'chest', equipment: 'barbell' },
  { id: 'a622af38-a710-488e-b39e-8c595b5b3a3e', names: { pt: 'Supino inclinado com halteres', en: 'Incline Dumbbell Bench Press' }, muscleGroup: 'chest', equipment: 'dumbbell' },
  { id: 'eccbc03e-9ee3-40f0-a9ae-545585464188', names: { pt: 'Crucifixo na máquina (peck deck)', en: 'Fly Machine' }, muscleGroup: 'chest', equipment: 'machine' },
  { id: '3476e4b6-7431-46ce-b50e-c654cd9fe413', names: { pt: 'Flexão de braço', en: 'Push-up' }, muscleGroup: 'chest', equipment: 'bodyweight' },
  // Costas
  { id: '25040dfc-6e71-42e6-bf59-60592896dfa8', names: { pt: 'Levantamento terra', en: 'Deadlift' }, muscleGroup: 'back', equipment: 'barbell' },
  { id: '5288f16c-a4e3-4624-92c7-af4a86a9106e', names: { pt: 'Remada curvada com barra', en: 'Barbell Row' }, muscleGroup: 'back', equipment: 'barbell' },
  { id: '5cddea39-1d2a-4db6-8948-c7cbb9ce5b0f', names: { pt: 'Puxada frontal', en: 'Lat Pulldown' }, muscleGroup: 'back', equipment: 'cable' },
  { id: '5767b536-3667-4f49-87b6-c6e82876c3e8', names: { pt: 'Barra fixa', en: 'Pull-up' }, muscleGroup: 'back', equipment: 'bodyweight' },
  { id: '70ccae95-b924-473c-ba5d-f065a95bb0e6', names: { pt: 'Remada baixa', en: 'Seated Cable Row' }, muscleGroup: 'back', equipment: 'cable' },
  // Ombros
  { id: 'b238da7f-84bd-4597-8ae5-ef944327ade3', names: { pt: 'Desenvolvimento militar', en: 'Overhead Press' }, muscleGroup: 'shoulders', equipment: 'barbell' },
  { id: '0a83f5f4-4394-41e2-9b53-70808a35693e', names: { pt: 'Elevação lateral', en: 'Lateral Raises (dumbbells)' }, muscleGroup: 'shoulders', equipment: 'dumbbell' },
  // Bíceps
  { id: 'b49b53af-e001-4e85-a981-78184eb3ff35', names: { pt: 'Rosca direta com barra', en: 'Barbell Curl' }, muscleGroup: 'biceps', equipment: 'barbell' },
  { id: '3033c08e-bb9d-4b1b-8a62-f156a57d66c7', names: { pt: 'Rosca martelo', en: 'Hammer Curl' }, muscleGroup: 'biceps', equipment: 'dumbbell' },
  // Tríceps
  { id: '582071f6-194d-48c9-b94e-444f69374975', names: { pt: 'Tríceps na polia', en: 'Cable Triceps Pushdown' }, muscleGroup: 'triceps', equipment: 'cable' },
  { id: '77b45908-566a-4f7f-b5ad-3fffc14d9856', names: { pt: 'Tríceps testa', en: 'Skull Crusher' }, muscleGroup: 'triceps', equipment: 'barbell' },
  { id: '521f85a1-bb9e-4e65-a62a-af68f1df421f', names: { pt: 'Mergulho nas paralelas', en: 'Dips' }, muscleGroup: 'triceps', equipment: 'bodyweight' },
  // Quadríceps
  { id: 'd83ca170-a96a-4895-b7ee-9f9957f035d2', names: { pt: 'Agachamento livre', en: 'Squats' }, muscleGroup: 'quads', equipment: 'barbell' },
  { id: '0f4b184d-9b1c-4a8a-8d0a-11bf5c0ac5b4', names: { pt: 'Leg press 45°', en: 'Leg Press 45°' }, muscleGroup: 'quads', equipment: 'machine' },
  { id: 'e335814f-b2d5-4028-9af2-259a116840f9', names: { pt: 'Cadeira extensora', en: 'Leg Extensions' }, muscleGroup: 'quads', equipment: 'machine' },
  // Posteriores
  { id: '9da25964-9985-4b1b-8a84-855fd55f1a08', names: { pt: 'Stiff', en: 'Stiff-Leg Deadlift' }, muscleGroup: 'hamstrings', equipment: 'barbell' },
  { id: '1b6f3b32-0bce-4d37-86ec-8fef101845c7', names: { pt: 'Mesa flexora', en: 'Leg Curl Machine' }, muscleGroup: 'hamstrings', equipment: 'machine' },
  // Glúteos
  { id: '2edf3dbe-5a3c-40bb-9a80-5cf171da8c48', names: { pt: 'Elevação pélvica', en: 'Hip Thrust' }, muscleGroup: 'glutes', equipment: 'barbell' },
  // Panturrilhas
  { id: '76852518-5cd5-4585-9079-8e06cdc47e3c', names: { pt: 'Panturrilha em pé', en: 'Calf Raises (standing)' }, muscleGroup: 'calves', equipment: 'machine' },
  // Abdômen
  { id: 'b5f7016e-4be7-4632-b312-f5de2fb017fd', names: { pt: 'Prancha', en: 'Plank' }, muscleGroup: 'core', equipment: 'bodyweight' },
  { id: 'ef4343bb-ffb2-4c16-b267-126b9534442e', names: { pt: 'Abdominal supra', en: 'Crunch' }, muscleGroup: 'core', equipment: 'bodyweight' },
]

/**
 * Biblioteca ampliada (cerca de 80 exercícios a mais). Em aparelhos já em uso,
 * entram pelo syncSeedExercises. O syncSeedExercises pula nomes que já existem,
 * então um exercício criado antes com o mesmo nome não aparece duplicado.
 */
// prettier-ignore
export const SEED_EXERCISES_LIBRARY: readonly SeedExercise[] = [
  { id: 'aee18d73-1f6c-4568-90b7-e4917281659f', names: { pt: 'Supino inclinado com barra', en: 'Incline Bench Press' }, muscleGroup: 'chest', equipment: 'barbell' },
  { id: 'd72ef0e8-d942-4980-92ce-1b31d41f8c67', names: { pt: 'Supino declinado com barra', en: 'Decline Bench Press' }, muscleGroup: 'chest', equipment: 'barbell' },
  { id: '5f382664-7dd5-46b5-b88b-79e742fd06d1', names: { pt: 'Supino reto com halteres', en: 'Dumbbell Bench Press' }, muscleGroup: 'chest', equipment: 'dumbbell' },
  { id: 'a5a0e43c-ee0c-46c2-a5bd-1e83d66eeb3c', names: { pt: 'Supino na máquina', en: 'Chest Press Machine' }, muscleGroup: 'chest', equipment: 'machine' },
  { id: 'f5480e76-c1da-4c45-96f6-23de628b278e', names: { pt: 'Supino inclinado na máquina', en: 'Incline Chest Press Machine' }, muscleGroup: 'chest', equipment: 'machine' },
  { id: '3a75b301-ff21-4bf5-ab7f-f16de42cd6c5', names: { pt: 'Supino no Smith', en: 'Smith Machine Bench Press' }, muscleGroup: 'chest', equipment: 'machine' },
  { id: '9c407137-217d-4869-8483-d748be7d461f', names: { pt: 'Crucifixo com halteres', en: 'Dumbbell Fly' }, muscleGroup: 'chest', equipment: 'dumbbell' },
  { id: '2d799026-23c1-4cc8-9bf1-b426b4770edd', names: { pt: 'Crucifixo inclinado com halteres', en: 'Incline Dumbbell Fly' }, muscleGroup: 'chest', equipment: 'dumbbell' },
  { id: 'dafbc67e-f391-4c59-8387-51aa987c4c9f', names: { pt: 'Crossover na polia', en: 'Cable Crossover' }, muscleGroup: 'chest', equipment: 'cable' },
  { id: 'f575fda0-9472-4d39-a0d3-6f02c89b10a6', names: { pt: 'Crossover de baixo para cima', en: 'Low-to-High Cable Fly' }, muscleGroup: 'chest', equipment: 'cable' },
  { id: '4adb3bf2-21b4-42e5-9b11-3dcb70e416fa', names: { pt: 'Pullover com halter', en: 'Dumbbell Pullover' }, muscleGroup: 'chest', equipment: 'dumbbell' },
  { id: '89f26fde-6ce5-40e7-96bc-d4e6afcf8efc', names: { pt: 'Puxada com triângulo', en: 'Triangle Lat Pulldown' }, muscleGroup: 'back', equipment: 'cable' },
  { id: '8fe5c73a-8791-431c-ac12-e5819988e3ee', names: { pt: 'Puxada supinada', en: 'Reverse-Grip Lat Pulldown' }, muscleGroup: 'back', equipment: 'cable' },
  { id: '12002bef-7553-4dba-a624-994b0a22786d', names: { pt: 'Pulldown com braços estendidos', en: 'Straight-Arm Pulldown' }, muscleGroup: 'back', equipment: 'cable' },
  { id: 'd77ae54e-616d-49b9-84d6-94c396d6262b', names: { pt: 'Remada cavalinho', en: 'T-Bar Row' }, muscleGroup: 'back', equipment: 'barbell' },
  { id: '27308cd4-6cf1-4e9d-affe-21c95e42641a', names: { pt: 'Remada unilateral com halter', en: 'One-Arm Dumbbell Row' }, muscleGroup: 'back', equipment: 'dumbbell' },
  { id: 'f766f061-4a7c-4ee9-be29-142a3c28c793', names: { pt: 'Remada na máquina', en: 'Machine Row' }, muscleGroup: 'back', equipment: 'machine' },
  { id: '81d1a72a-c0d7-44dc-91ec-42314377d551', names: { pt: 'Puxada na máquina', en: 'Machine Lat Pulldown' }, muscleGroup: 'back', equipment: 'machine' },
  { id: '635b5f61-d48d-46cc-b5ed-4e0435133558', names: { pt: 'Barra fixa supinada', en: 'Chin-up' }, muscleGroup: 'back', equipment: 'bodyweight' },
  { id: 'c90b3ea9-95d1-4c63-88e6-2e62c4fb1940', names: { pt: 'Hiperextensão lombar', en: 'Back Extensions' }, muscleGroup: 'back', equipment: 'bodyweight' },
  { id: '725dd439-48ff-4494-8fd3-70b2e78c5af2', names: { pt: 'Encolhimento com halteres', en: 'Dumbbell Shrug' }, muscleGroup: 'back', equipment: 'dumbbell' },
  { id: 'dfc943fb-242e-4896-9e4c-8bc48cca7dd0', names: { pt: 'Desenvolvimento com halteres', en: 'Dumbbell Shoulder Press' }, muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { id: 'f2d4f167-0b44-4d10-9814-32ab5c199aed', names: { pt: 'Desenvolvimento na máquina', en: 'Shoulder Press Machine' }, muscleGroup: 'shoulders', equipment: 'machine' },
  { id: 'b3980f42-16cb-49c1-835e-f7ebabb55488', names: { pt: 'Desenvolvimento Arnold', en: 'Arnold Press' }, muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { id: 'a27f3818-b347-4fa1-9fbb-b0b8194f04ef', names: { pt: 'Elevação lateral na polia', en: 'Cable Lateral Raises' }, muscleGroup: 'shoulders', equipment: 'cable' },
  { id: 'c103b208-23b6-43d1-93aa-e70e9787d1cd', names: { pt: 'Elevação lateral na máquina', en: 'Lateral Raise Machine' }, muscleGroup: 'shoulders', equipment: 'machine' },
  { id: '8165e0f5-dfeb-43b6-b647-65f4c587762b', names: { pt: 'Elevação frontal', en: 'Front Raises' }, muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { id: 'b0f757ba-6181-4365-ac2d-6fd0d817a662', names: { pt: 'Crucifixo inverso na máquina', en: 'Reverse Fly Machine' }, muscleGroup: 'shoulders', equipment: 'machine' },
  { id: '1feed88c-1376-4147-9889-124e9477346a', names: { pt: 'Crucifixo inverso com halteres', en: 'Reverse Dumbbell Fly' }, muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { id: '2a7daf92-b906-46fc-994f-bfab5ac6e8cd', names: { pt: 'Face pull', en: 'Face Pull' }, muscleGroup: 'shoulders', equipment: 'cable' },
  { id: '19dead17-4106-459a-99ce-6cdc60e5ba32', names: { pt: 'Remada alta', en: 'Upright Row' }, muscleGroup: 'shoulders', equipment: 'barbell' },
  { id: '4e5d6b87-3734-42c8-b57a-53ef7ee898c2', names: { pt: 'Rosca alternada', en: 'Alternating Dumbbell Curl' }, muscleGroup: 'biceps', equipment: 'dumbbell' },
  { id: 'ff9eafae-33c9-41d2-ab2a-59b4cc3240f5', names: { pt: 'Rosca no banco 45°', en: 'Curls 45°' }, muscleGroup: 'biceps', equipment: 'dumbbell' },
  { id: '52277721-e870-46ee-a609-9dc58f837228', names: { pt: 'Rosca direta com barra W', en: 'EZ-Bar Curl' }, muscleGroup: 'biceps', equipment: 'barbell' },
  { id: '29c3c19a-8497-4dcb-8a44-6e7a1ec3c119', names: { pt: 'Rosca Scott com barra W', en: 'EZ-Bar Preacher Curl' }, muscleGroup: 'biceps', equipment: 'barbell' },
  { id: '270e767f-2ba1-4c5c-bd91-114dac5ef29c', names: { pt: 'Rosca Scott na máquina', en: 'Scott Curl Machine' }, muscleGroup: 'biceps', equipment: 'machine' },
  { id: '2f8622c7-d00b-4c90-bfcd-36554202a19f', names: { pt: 'Rosca concentrada', en: 'Concentration Curl' }, muscleGroup: 'biceps', equipment: 'dumbbell' },
  { id: 'a1ed8737-0de8-4a00-ba7e-a55d20b5257b', names: { pt: 'Rosca na polia', en: 'Cable Curl' }, muscleGroup: 'biceps', equipment: 'cable' },
  { id: '93530056-c53b-4364-aa1e-13bf4679f726', names: { pt: 'Rosca martelo na corda', en: 'Rope Hammer Curl' }, muscleGroup: 'biceps', equipment: 'cable' },
  { id: '014ff5e5-ec9f-46cc-a993-c747476950dc', names: { pt: 'Tríceps corda', en: 'Rope Pushdown' }, muscleGroup: 'triceps', equipment: 'cable' },
  { id: '7e4c27c6-a239-492b-ae6e-4a288e208d43', names: { pt: 'Tríceps francês na corda', en: 'French Triceps (rope)' }, muscleGroup: 'triceps', equipment: 'cable' },
  { id: '2ebd4a81-0a89-4a2b-b585-99ebcc9881e5', names: { pt: 'Tríceps francês com halter', en: 'Overhead Dumbbell Extension' }, muscleGroup: 'triceps', equipment: 'dumbbell' },
  { id: '9df22a6d-2721-4ffd-aa9e-d8bbb2d57017', names: { pt: 'Tríceps coice', en: 'Triceps Kickback' }, muscleGroup: 'triceps', equipment: 'dumbbell' },
  { id: 'cab21a0e-1632-4cf3-b801-a15227f3ac33', names: { pt: 'Supino fechado', en: 'Close-Grip Bench Press' }, muscleGroup: 'triceps', equipment: 'barbell' },
  { id: 'a46b768a-2207-418c-b3d1-0ec86aad9cd3', names: { pt: 'Tríceps na máquina', en: 'Triceps Dip Machine' }, muscleGroup: 'triceps', equipment: 'machine' },
  { id: 'fa81a354-7c41-4b4a-853d-9579b8709148', names: { pt: 'Mergulho no banco', en: 'Bench Dips' }, muscleGroup: 'triceps', equipment: 'bodyweight' },
  { id: '02d86c23-9f8e-40e2-901b-78991af0f2a6', names: { pt: 'Agachamento pêndulo / hack', en: 'Pendulum / Hack Squat' }, muscleGroup: 'quads', equipment: 'machine' },
  { id: 'efd93151-8fcb-47d5-aa56-413587294bb8', names: { pt: 'Leg press unilateral', en: 'Unilateral Leg Press' }, muscleGroup: 'quads', equipment: 'machine' },
  { id: 'b1899f84-e157-4764-94eb-1e3ca9bec531', names: { pt: 'Leg press horizontal', en: 'Horizontal Leg Press' }, muscleGroup: 'quads', equipment: 'machine' },
  { id: '98c249d7-bd7a-4fba-bf54-672854eb0003', names: { pt: 'Agachamento no Smith', en: 'Smith Machine Squat' }, muscleGroup: 'quads', equipment: 'machine' },
  { id: '6c66257c-52dc-439c-bbe3-5f4b476e87b2', names: { pt: 'Agachamento frontal', en: 'Front Squat' }, muscleGroup: 'quads', equipment: 'barbell' },
  { id: 'e2693e30-d085-4e83-b108-248ea6b4bbe7', names: { pt: 'Agachamento búlgaro', en: 'Bulgarian Split Squat' }, muscleGroup: 'quads', equipment: 'dumbbell' },
  { id: 'e03ea205-bedb-4b85-8659-19f81c528fd6', names: { pt: 'Afundo com halteres', en: 'Dumbbell Lunges' }, muscleGroup: 'quads', equipment: 'dumbbell' },
  { id: 'eb658e68-5211-4b37-9ca9-375fb1e04c45', names: { pt: 'Agachamento goblet', en: 'Goblet Squat' }, muscleGroup: 'quads', equipment: 'kettlebell' },
  { id: 'd23b61e8-70b3-44c7-a268-e471a0950897', names: { pt: 'Cadeira adutora', en: 'Hip Adduction Machine' }, muscleGroup: 'quads', equipment: 'machine' },
  { id: 'c908bf0c-8e2e-49f1-a9db-3601e9407f81', names: { pt: 'Levantamento terra romeno', en: 'Romanian Deadlift' }, muscleGroup: 'hamstrings', equipment: 'barbell' },
  { id: '4060d00f-c826-4fd1-bfca-7220f4fef219', names: { pt: 'Terra romeno com halteres', en: 'RDL (dumbbells)' }, muscleGroup: 'hamstrings', equipment: 'dumbbell' },
  { id: 'e2d12654-e5db-4aea-b3d1-d005e806d4b4', names: { pt: 'Cadeira flexora', en: 'Seated Leg Curl' }, muscleGroup: 'hamstrings', equipment: 'machine' },
  { id: '7fd466e8-3a82-4b26-aa67-9c89157604d7', names: { pt: 'Flexora em pé', en: 'Standing Leg Curl' }, muscleGroup: 'hamstrings', equipment: 'machine' },
  { id: 'ebfea39b-0245-4898-8903-9b6d6008dd1c', names: { pt: 'Bom dia (good morning)', en: 'Good Morning' }, muscleGroup: 'hamstrings', equipment: 'barbell' },
  { id: '768b3d09-32a1-4cde-9b1d-4811f51bcf35', names: { pt: 'Flexão nórdica', en: 'Nordic Curl' }, muscleGroup: 'hamstrings', equipment: 'bodyweight' },
  { id: '03294142-44ff-4d08-bda2-47607bd5262a', names: { pt: 'Elevação pélvica na máquina', en: 'Hip Thrust Machine' }, muscleGroup: 'glutes', equipment: 'machine' },
  { id: '73aec486-d10b-489b-9499-dfb3acfbd82a', names: { pt: 'Ponte de glúteo', en: 'Glute Bridge' }, muscleGroup: 'glutes', equipment: 'bodyweight' },
  { id: 'e1d4fcd9-221f-4408-8ad5-af331b6f5ce0', names: { pt: 'Cadeira abdutora', en: 'Hip Abduction Machine' }, muscleGroup: 'glutes', equipment: 'machine' },
  { id: '8fbad080-96c0-4c36-b567-126ed13af8db', names: { pt: 'Glúteo na polia (coice)', en: 'Cable Glute Kickback' }, muscleGroup: 'glutes', equipment: 'cable' },
  { id: 'c8bf1a16-14a9-4eb0-9ccd-39187e9218e2', names: { pt: 'Glúteo na máquina (coice)', en: 'Glute Kickback Machine' }, muscleGroup: 'glutes', equipment: 'machine' },
  { id: 'b250954f-c344-460b-8310-15fce5880f23', names: { pt: 'Levantamento terra sumô', en: 'Sumo Deadlift' }, muscleGroup: 'glutes', equipment: 'barbell' },
  { id: 'b8de86a3-f04a-40ac-b713-dd7d673974db', names: { pt: 'Swing com kettlebell', en: 'Kettlebell Swing' }, muscleGroup: 'glutes', equipment: 'kettlebell' },
  { id: '497b0419-7734-497e-a5ee-ea80a66063f3', names: { pt: 'Panturrilha sentado', en: 'Calf Raises (seated)' }, muscleGroup: 'calves', equipment: 'machine' },
  { id: '8d7de7f6-c6de-48ac-8579-0d46ef7db24a', names: { pt: 'Panturrilha no leg press', en: 'Leg Press Calf Raises' }, muscleGroup: 'calves', equipment: 'machine' },
  { id: '4fb9f853-28d2-4d35-bb98-b329d071aa1f', names: { pt: 'Panturrilha unilateral com halter', en: 'Single-Leg Calf Raise' }, muscleGroup: 'calves', equipment: 'dumbbell' },
  { id: '11446671-d54a-409f-8054-b4b55b23d0af', names: { pt: 'Abdominal na máquina', en: 'Abs Machine' }, muscleGroup: 'core', equipment: 'machine' },
  { id: '98055ef9-4e27-46bd-b57d-ce0874d27b2f', names: { pt: 'Abdominal na polia', en: 'Cable Crunch' }, muscleGroup: 'core', equipment: 'cable' },
  { id: 'd6f87811-869d-4d76-8762-fd0556ee5bc6', names: { pt: 'Elevação de pernas na barra', en: 'Hanging Leg Raise' }, muscleGroup: 'core', equipment: 'bodyweight' },
  { id: '535b9c3b-9d2d-4f22-8e3c-824535634026', names: { pt: 'Abdominal infra no banco', en: 'Lying Leg Raise' }, muscleGroup: 'core', equipment: 'bodyweight' },
  { id: 'cf54a3fd-bd6a-4f48-a9dc-68e55c30a3e8', names: { pt: 'Abdominal bicicleta', en: 'Bicycle Crunch' }, muscleGroup: 'core', equipment: 'bodyweight' },
  { id: '649466c2-d9e3-4843-90c2-5733d3b75b08', names: { pt: 'Prancha lateral', en: 'Side Plank' }, muscleGroup: 'core', equipment: 'bodyweight' },
  { id: '9df71f4e-6b3c-4533-aa56-52572e50c742', names: { pt: 'Roda abdominal', en: 'Ab Wheel Rollout' }, muscleGroup: 'core', equipment: 'bodyweight' },
  { id: '98165759-8661-4be9-b306-730762adbce6', names: { pt: 'Pallof press', en: 'Pallof Press' }, muscleGroup: 'core', equipment: 'cable' },
]

/** Todos os exercícios iniciais: a lista original + a biblioteca ampliada. */
export const SEED_EXERCISES: readonly SeedExercise[] = [
  ...SEED_EXERCISES_V1,
  ...SEED_EXERCISES_LIBRARY,
]

/**
 * Coloca no banco os exercícios do seed que ainda faltam. Roda a cada abertura do app.
 *
 * Antes, o seed só rodava com o banco vazio, e por isso exercícios novos
 * adicionados aqui nunca chegariam a quem já usa o app. Agora cada exercício
 * entra se ainda não existir, com três cuidados:
 * - compara o id com TODOS os registros, inclusive os excluídos: o que o
 *   usuário apagou não "ressuscita";
 * - não entra se já existir um exercício com o mesmo nome (em qualquer idioma),
 *   como os criados pelo próprio usuário: assim nada aparece duplicado;
 * - roda numa transação de escrita: duas chamadas ao mesmo tempo (ex.: React
 *   StrictMode) não conseguem inserir em dobro.
 *
 * Devolve quantos exercícios foram inseridos.
 */
export async function syncSeedExercises(db: EncoreDB): Promise<number> {
  return db.transaction('rw', db.exercises, async () => {
    const existing = await db.exercises.toArray()
    const ids = new Set(existing.map((exercise) => exercise.id))
    const names = new Set(
      existing.flatMap((exercise) =>
        LANGUAGES.map((lang) => nameKey(exercise.names[lang])),
      ),
    )

    const missing = SEED_EXERCISES.filter(
      (seed) =>
        !ids.has(seed.id) &&
        !LANGUAGES.some((lang) => names.has(nameKey(seed.names[lang]))),
    )
    if (missing.length === 0) {
      return 0
    }

    const now = Date.now()
    const exercises: Exercise[] = missing.map((seed) => ({
      ...seed,
      isCustom: false,
      createdAt: now,
      // 0: o exercício do seed nunca "vence" uma versão vinda de um backup (por exemplo,
      // uma exclusão) na hora de juntar os dados; qualquer edição do usuário é mais nova.
      updatedAt: 0,
      deletedAt: null,
    }))
    await db.exercises.bulkAdd(exercises)
    return exercises.length
  })
}
