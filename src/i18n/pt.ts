import type { Equipment, MuscleGroup } from '../db/types'

/*
 * Texts of the app in Portuguese. This file is the SOURCE OF TRUTH: the type
 * `Messages` comes from here, and `en.ts` must have exactly the same keys.
 *
 * Text that depends on a value (plural, name, number) is a function.
 */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const muscleGroups: Record<MuscleGroup, string> = {
  chest: 'Peito',
  back: 'Costas',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quads: 'Quadríceps',
  hamstrings: 'Posteriores',
  glutes: 'Glúteos',
  calves: 'Panturrilhas',
  core: 'Abdômen',
}

const equipment: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Halteres',
  machine: 'Máquina',
  cable: 'Polia',
  bodyweight: 'Peso corporal',
  kettlebell: 'Kettlebell',
}

export const pt = {
  common: {
    /** Chart periods (PeriodTabs). */
    period: {
      label: 'Período do gráfico',
      short: { '3m': '3M', '1y': '1A', all: 'Tudo' },
      names: { '3m': 'Últimos 3 meses', '1y': 'Último ano', all: 'Tudo' },
      tooFew: 'Poucos registros neste período para um gráfico.',
    },
    close: 'Fechar',
    done: 'Pronto',
    cancel: 'Cancelar',
    save: 'Salvar',
    undo: 'Desfazer',
    // Weight unit (for now only kg; kg/lb comes in when the units.ts functions exist).
    kg: 'kg',
    actionFailed: 'Não foi possível gravar. Tente de novo.',
    back: 'Voltar',
    exerciseFallback: 'Exercício',
    decrease: (label: string) => `Diminuir ${label}`,
    increase: (label: string) => `Aumentar ${label}`,
  },
  app: {
    mainNav: 'Navegação principal',
    openMenu: 'Abrir menu',
    menu: 'Menu',
    settings: 'Configurações',
  },
  nav: {
    workout: 'Treino',
    routines: 'Rotinas',
    exercises: 'Exercícios',
    history: 'Histórico',
  },
  muscleGroups,
  equipment,
  errors: {
    title: 'Algo deu errado',
    description:
      'O app encontrou um erro inesperado. Seus treinos continuam salvos no aparelho.',
    databaseDescription:
      'Não foi possível abrir os dados deste aparelho. Feche outras abas do Encore e recarregue; se persistir, verifique o espaço livre e se o navegador não está em modo privado.',
    reload: 'Recarregar',
  },
  update: {
    available: 'Nova versão disponível',
    later: 'Depois',
    update: 'Atualizar',
  },
  workout: {
    title: 'Treino',
    chooseWorkout: 'Escolha o treino',
    exerciseCount: (n: number) => plural(n, 'exercício', 'exercícios'),
    nextInSequence: 'próximo da sequência',
    freeWorkout: 'Treino livre',
    inProgress: 'Treino em andamento',
    continue: 'Continuar',
    continueTo: (name: string) => `Continuar treino ${name}`,
    backToWorkout: (name: string) => `Voltar ao treino ${name}`,
    noRoutinesTitle: 'Nenhum treino em andamento',
    noRoutinesDescription:
      'Comece um treino livre, ou carregue suas rotinas na aba Rotinas.',
    seeRoutines: 'Ver rotinas',
    /** `days` = days since the last backup; `null` = never done. */
    backupReminder: (days: number | null) =>
      days === null
        ? 'Você ainda não fez backup. Seus treinos ficam só neste aparelho.'
        : `Último backup há ${days} dias. Seus treinos ficam só neste aparelho.`,
    backupReminderAction: 'Fazer backup',
    weeklyGoal: {
      label: 'Meta da semana',
      thisWeek: 'Esta semana',
      progress: (done: number, goal: number) =>
        `${done} de ${plural(goal, 'treino', 'treinos')}`,
      /** Weeks in a row that met the goal (the current one included once it is met). */
      streak: (n: number) =>
        n === 1 ? '1 semana na meta' : `${n} semanas seguidas na meta`,
    },
    emptyTitle: 'Treino vazio',
    emptyDescription: 'Adicione o primeiro exercício para começar a registrar as séries.',
    addExercise: '+ Adicionar exercício',
    finish: 'Finalizar treino',
    progress: (done: number, total: number) =>
      `Progresso do treino: ${done} de ${total} séries`,
    setDeleted: 'Série excluída',
    exerciseRemoved: 'Exercício removido',
    discard: 'Descartar treino',
    lastTime: (summary: string) => `Última vez: ${summary}`,
    reference: (summary: string) => `Referência: ${summary}`,
    /** The same set last time, under the set's numbers. */
    previousSet: (summary: string) => `Última: ${summary}`,
    /** Accessible-name suffix of a set with a previous counterpart. */
    previousSetLabel: (summary: string) => `última vez ${summary}`,
    addSet: '+ Série',
    addEncore: '+ Encore',
    encore: 'Encore',
    addWarmup: '+ Aquecimento',
    warmup: 'Aquecimento',
    /** Short label in place of the warm-up set number. */
    warmupShort: 'AQ',
    removeExercise: 'Remover exercício',
    moreOptions: (name: string) => `Mais opções: ${name}`,
    /** Reps in reserve (RIR): how many more reps were left. 3 means "3 or more". */
    rir: {
      question: 'Quantas reps sobraram?',
      value: (n: number) => (n >= 3 ? 'RIR 3+' : `RIR ${n}`),
    },
    /** Plate calculator under the load in the set editor (barbell). */
    plates: {
      perSide: (plates: string) => `Por lado: ${plates}`,
      barOnly: 'Só a barra',
      belowBar: (bar: string) => `Menos que a barra (${bar} kg)`,
      missing: (kg: string) => `faltam ${kg} kg`,
    },
    /** The day's note of an exercise (shown again the next time). */
    note: {
      add: 'Anotar',
      edit: 'Editar nota',
      title: (name: string) => `Nota · ${name}`,
      label: 'Nota do dia',
      placeholder: 'Ex.: pegada fechada, ombro incomodou',
      hint: 'Aparece na próxima vez que você fizer este exercício. Deixe vazio para apagar.',
      save: 'Salvar nota',
      /** Tapping today's note on the card opens the editor. */
      editLabel: (name: string, note: string) => `Editar nota de ${name}: ${note}`,
      previous: (note: string) => `Nota anterior: ${note}`,
    },
    // `label` is the set number (1, 2...) or "AQ" for warm-up.
    // The name includes exercise and values: there are several "set 1" on screen and the screen reader
    // needs to know which one it is.
    editSet: (label: number | string, details: string) =>
      `Editar série ${label}: ${details}`,
    completeSet: (label: number | string) => `Concluir série ${label}`,
    undoSet: (label: number | string) => `Desfazer série ${label}`,
    setTitle: (name: string, n: number) => `${name} · Série ${n}`,
    warmupTitle: (name: string) => `${name} · Aquecimento`,
    weight: 'Carga',
    reps: 'Repetições',
    completeSetButton: 'Concluir série',
    deleteSet: 'Excluir série',
    suggestion: {
      label: 'Sugestão',
      increase: 'Subir carga',
      moreReps: '+1 rep',
      apply: 'Aplicar',
      applyTo: (name: string) => `Aplicar sugestão em ${name}`,
      applied: 'Aplicada',
    },
    /** Plateau notice: the last 3 sessions did not beat the best before them. */
    plateau: {
      label: 'Platô',
      deload: 'Deload · -10%',
      deloadHint:
        '3 treinos sem superar o seu melhor. Uma sessão 10% mais leve ajuda a voltar mais forte.',
      pushHint:
        '3 treinos sem superar o seu melhor, mas ainda sobravam reps: force mais antes de recuar.',
      dismiss: 'Ignorar',
      dismissFor: (name: string) => `Ignorar platô em ${name}`,
    },
    timer: {
      label: 'Cronômetro',
      start: 'Iniciar cronômetro',
      notStarted: 'Cronômetro não iniciado',
      running: 'Cronômetro rodando',
      stopped: 'Cronômetro parado',
      paused: 'Cronômetro pausado',
      pause: 'Pausar',
      resume: 'Retomar',
      rest: 'Descansar',
    },
    rest: {
      label: 'Descanso',
      over: 'Descanso acabou',
      go: 'Bora!',
      skip: 'Pular',
      ok: 'OK',
      add15: '+15s',
    },
    confirm: {
      finishTitle: 'Finalizar treino?',
      /** `pending` = sets without ✓, which finishing deletes (said out loud, with the count). */
      finishDescription: (n: number, pending: number) =>
        pending === 0
          ? `${plural(n, 'série concluída', 'séries concluídas')}.`
          : `${plural(n, 'série concluída', 'séries concluídas')}. ${
              pending === 1
                ? '1 série não marcada será descartada.'
                : `${pending} séries não marcadas serão descartadas.`
            }`,
      finishEmptyDescription:
        'Nenhuma série foi concluída, então o treino será descartado.',
      finishConfirm: 'Finalizar',
      discardTitle: 'Descartar treino?',
      discardDescription: 'Todas as séries deste treino serão apagadas.',
      discardConfirm: 'Descartar',
      removeTitle: 'Remover exercício?',
      removeDescription: (name: string) => `${name} e as séries dele saem deste treino.`,
      removeConfirm: 'Remover',
    },
  },
  splits: {
    tabsLabel: 'Divisões de treino',
    newSplit: '+ Nova divisão',
    defaultName: 'Nova divisão',
    createFirst: 'Criar divisão',
    edit: 'Editar divisão',
    editTitle: 'Editar divisão',
    name: 'Nome',
    notes: 'Observações',
    notesPlaceholder: 'Ex.: 4x por semana',
    moveLeft: 'Mover para a esquerda',
    moveRight: 'Mover para a direita',
    routineCount: (n: number) => plural(n, 'rotina', 'rotinas'),
    emptySplit: 'Nenhuma rotina nesta divisão ainda.',
    emptySplitWorkout: 'Esta divisão ainda não tem rotinas.',
    addRoutines: 'Adicionar rotinas',
    deleteSplit: 'Excluir divisão',
    deleteTitle: 'Excluir divisão?',
    /** `n` = how many routines the split has (they are deleted along with it). */
    deleteDescription: (n: number) =>
      n === 0
        ? 'A divisão está vazia e sai da lista.'
        : `A divisão e ${n === 1 ? 'a rotina dela serão excluídas' : `as ${n} rotinas dela serão excluídas`}. Os treinos que você já fez continuam no histórico.`,
    deleteConfirm: 'Excluir',
    /** Title of the selector in the routine editor. */
    ofRoutine: 'Divisão',
    ofRoutineHint: 'Toque em outra divisão para mover esta rotina para lá.',
  },
  routines: {
    title: 'Rotinas',
    count: (n: number) => plural(n, 'treino', 'treinos'),
    emptyTitle: 'Nenhuma rotina ainda',
    emptyDescription:
      'Comece criando uma divisão de treino (por exemplo, Upper/Lower ou PPL) e as rotinas dela.',
    start: 'Iniciar',
    resume: 'Continuar',
    activeTitle: 'Treino em andamento',
    activeDescription: (name: string) =>
      `${name} ainda está em andamento. Finalize ou descarte esse treino antes de começar outro.`,
    goToWorkout: 'Ir para o treino',
    reference: (summary: string) => `Ref.: ${summary}`,
    newRoutine: '+ Nova rotina',
    newTitle: 'Nova rotina',
    namePlaceholder: 'Ex.: Push, Upper A, Peito e tríceps',
    exercisesHint: 'Toque em um exercício para ajustar séries, repetições e descanso.',
    unsaved: 'Alterações não salvas',
    noChanges: 'Nenhuma alteração',
    needName: 'Dê um nome à rotina para salvar',
    saveFailed: 'Não foi possível salvar. Tente de novo.',
    discardTitle: 'Descartar alterações?',
    discardDescription: 'As mudanças que você fez nesta rotina ainda não foram salvas.',
    discardConfirm: 'Descartar',
    edit: 'Editar',
    editorTitle: 'Editar rotina',
    notFound: 'Rotina não encontrada',
    name: 'Nome',
    notes: 'Observações',
    notesPlaceholder: 'Ex.: mobilidade antes, cardio no final',
    exercisesTitle: 'Exercícios',
    noExercises: 'Nenhum exercício nesta rotina ainda.',
    addExercise: '+ Adicionar exercício',
    editItem: (name: string) => `Editar ${name}`,
    moveUp: (name: string) => `Mover ${name} para cima`,
    moveDown: (name: string) => `Mover ${name} para baixo`,
    sequence: 'Posição na sequência',
    sequenceHint: 'A ordem define qual rotina o app sugere como a próxima.',
    position: (n: number, total: number) => `${n} de ${total}`,
    moveRoutineUp: 'Subir',
    moveRoutineDown: 'Descer',
    sets: 'Séries',
    repsMin: 'Reps mínimas',
    repsMax: 'Reps máximas',
    referenceWeight: 'Carga de referência',
    referenceHint:
      'Preenche as séries enquanto ainda não há histórico deste exercício. 0 = sem referência.',
    rest: 'Descanso',
    restDefault: (clock: string) => `Padrão (${clock})`,
    restHint:
      'Depois de cada série deste exercício. "Padrão" segue o descanso das Configurações.',
    itemNotes: 'Observação',
    itemNotesPlaceholder: 'Ex.: carga por lado',
    removeFromRoutine: 'Remover da rotina',
    deleteRoutine: 'Excluir rotina',
    deleteTitle: 'Excluir rotina?',
    deleteDescription:
      'A rotina sai da lista. Os treinos já feitos com ela continuam no histórico.',
    deleteConfirm: 'Excluir',
  },
  exercises: {
    title: 'Exercícios',
    count: (n: number) => `${n} na biblioteca`,
    emptyTitle: 'Nenhum exercício',
    emptyDescription: 'Sua biblioteca de exercícios aparece aqui.',
    search: 'Buscar exercício',
    all: 'Todos os grupos',
    kindLabel: 'Tipo de exercício',
    kinds: {
      all: 'Todos',
      free: 'Livres',
      machine: 'Máquinas',
    },
    noResults: 'Nenhum exercício encontrado.',
    detail: {
      records: 'Recordes',
      heaviest: 'Maior carga',
      bestOneRepMax: '1RM estimado',
      oneRepMaxChart: '1RM estimado por sessão',
      weightChart: 'Carga máxima por sessão',
      repsChart: 'Máximo de repetições por sessão',
      /** Screen-reader summary of a chart. */
      chartSummary: (what: string, first: string, last: string, sessions: number) =>
        `${what}: de ${first} a ${last} em ${plural(sessions, 'sessão', 'sessões')}`,
      needMore: 'Treine este exercício mais uma vez para ver o gráfico.',
      sessions: 'Sessões',
      topSet: (set: string) => `Melhor série: ${set}`,
      oneRepMax: (value: string) => `1RM ${value}`,
      emptyTitle: 'Sem histórico ainda',
      emptyDescription: 'Conclua uma série deste exercício e a evolução aparece aqui.',
      notFoundTitle: 'Exercício não encontrado',
      notFoundDescription: 'Ele pode ter sido excluído.',
    },
    pickTitle: 'Adicionar exercício',
    createNamed: (name: string) => `+ Criar “${name}”`,
    newTitle: 'Novo exercício',
    nameLabel: 'Nome do exercício',
    muscleLabel: 'Grupo muscular',
    equipmentLabel: 'Equipamento',
    createAndAdd: 'Criar e adicionar',
    /** Edit and delete a user exercise (its progress screen). */
    manage: {
      edit: 'Editar exercício',
      editTitle: 'Editar exercício',
      nameTaken: 'Já existe um exercício com esse nome.',
      delete: 'Excluir exercício',
      deleteTitle: 'Excluir exercício?',
      deleteDescription:
        'Ele sai da biblioteca e da busca. Os treinos em que você o fez continuam no histórico.',
      deleteConfirm: 'Excluir',
      deleted: 'Exercício excluído',
      inUseTitle: 'Exercício em uso',
      inUseDescription: (routines: string) =>
        `Ele está nas rotinas: ${routines}. Tire o exercício delas antes de excluir.`,
      understood: 'Entendi',
    },
    customHint:
      'O exercício fica salvo na sua biblioteca e passa a aparecer na aba Exercícios.',
  },
  records: {
    /** Short badge on a record set. */
    badge: 'PR',
    personalRecord: 'recorde pessoal',
    newRecord: (exercise: string) => `Novo recorde: ${exercise}`,
    inWorkout: (n: number) => plural(n, 'recorde pessoal', 'recordes pessoais'),
  },
  history: {
    title: 'Histórico',
    count: (n: number) => plural(n, 'treino', 'treinos'),
    emptyTitle: 'Nada por aqui ainda',
    emptyDescription:
      'Cada treino terminado vira um registro nesta tela. O primeiro é o mais difícil.',
    duration: 'Duração',
    sets: 'Séries',
    volume: 'Volume',
    comparedTo: (routine: string, date: string) => `Comparado ao ${routine} de ${date}`,
    minutes: (n: number) => `${n} min`,
    notFoundTitle: 'Treino não encontrado',
    notFoundDescription: 'Ele pode ter sido excluído.',
    deleteWorkout: 'Excluir treino',
    deleteTitle: 'Excluir treino?',
    deleteDescription:
      'Ele sai do histórico e deixa de contar como "última vez" nos próximos treinos.',
    deleteConfirm: 'Excluir',
    workoutDeleted: 'Treino excluído',
    thisWeek: 'Esta semana',
    weeklyLabel: 'Volume da semana por grupo muscular',
    weeklyEmpty: 'Nenhum treino nesta semana ainda.',
    setCount: (n: number) => plural(n, 'série', 'séries'),
    editHint: 'Toque numa série para corrigir a carga ou as repetições.',
    addSetTo: (name: string) => `Adicionar série em ${name}`,
    loadMore: 'Carregar mais',
    /** Under the list while there are older workouts to load. */
    showing: (shown: number, total: number) => `Mostrando ${shown} de ${total}`,
    /** "Your month / your year" (/historico/resumo). */
    review: {
      title: 'Resumo',
      open: 'Seu mês e seu ano em números',
      scope: 'Período do resumo',
      month: 'Mês',
      year: 'Ano',
      previous: 'Período anterior',
      next: 'Próximo período',
      empty: 'Nenhum treino neste período.',
      workouts: 'Treinos',
      time: 'Tempo',
      hours: (n: number) => `${n} h`,
      perWeek: 'Por semana',
      records: 'Recordes',
      mostImproved: 'Mais evoluiu (1RM estimado)',
      mostDone: 'Mais feito',
      sessions: (n: number) => plural(n, 'treino', 'treinos'),
    },
    /** Sets per muscle over the last 8 weeks (/historico/volume). */
    trend: {
      title: 'Séries por músculo',
      open: 'Ver as últimas 8 semanas',
      hint: (min: number, max: number) =>
        `Séries de trabalho por semana, nas últimas 8 semanas. As linhas marcam ${min} e ${max} séries, a faixa usual para hipertrofia.`,
      average: (value: string) => `média ${value}/semana`,
      summary: (muscle: string, weeks: string) =>
        `${muscle}: séries por semana, da mais antiga para esta: ${weeks}`,
      weeksAgo: (n: number) => `há ${n} semanas`,
      thisWeek: 'esta semana',
      emptyTitle: 'Nenhuma série nas últimas 8 semanas',
      emptyDescription: 'Termine um treino e o volume de cada músculo aparece aqui.',
    },
    calendar: {
      label: 'Calendário de treinos',
      previousMonth: 'Mês anterior',
      nextMonth: 'Próximo mês',
      /** How many workouts in the month shown. */
      monthCount: (n: number) => plural(n, 'treino', 'treinos'),
      /** Screen-reader text of a trained day (`date` already formatted). */
      trainedDay: (date: string) => `${date}: treinou`,
    },
    /** Post-workout summary, right after finishing. */
    finished: {
      title: 'Treino concluído',
      backup: 'Fazer backup',
      /** `percent` = whole-percent volume change against the last time of the routine. */
      volumeChange: (percent: number) =>
        percent === 0
          ? 'Mesmo volume da última vez.'
          : `${percent > 0 ? '+' : '−'}${Math.abs(percent)}% de volume em relação à última vez.`,
      firstTime: 'Primeira vez deste treino: agora você tem uma marca para bater.',
    },
  },
  settings: {
    title: 'Configurações',
    language: 'Idioma',
    rest: 'Descanso',
    restDuration: 'Duração padrão',
    autoStartRest: 'Começar o descanso ao concluir uma série',
    on: 'Ligado',
    off: 'Desligado',
    duringWorkout: 'Durante o treino',
    keepScreenOn: 'Manter a tela ligada',
    restSound: 'Bipe no fim do descanso',
    weightSteps: 'Saltos de carga',
    weightStepsHint:
      'O menor aumento possível em cada equipamento da sua academia. Vale para a sugestão de carga e para os botões − e + da série.',
    plates: {
      title: 'Barra e anilhas',
      hint: 'O editor de série dos exercícios com barra mostra quais anilhas vão em cada lado.',
      bar: 'Peso da barra',
      available: 'Anilhas da sua academia (kg)',
    },
    weeklyGoal: 'Meta semanal',
    weeklyGoalHint:
      'Quantos treinos por semana você quer fazer; o progresso aparece na aba Treino. Auto = uma vez cada rotina da divisão escolhida.',
    weeklyGoalAuto: 'Auto',
    backup: 'Backup',
    backupHint:
      'Seus treinos ficam só neste aparelho. Exporte um arquivo de vez em quando, e importe-o para levar os dados a outro aparelho.',
    exportBackup: 'Exportar backup',
    importBackup: 'Importar backup',
    exported: 'Backup exportado.',
    exportUnconfirmed:
      'Não deu para confirmar que o arquivo foi salvo. Confira seus arquivos ou tente de novo.',
    lastBackup: (days: number | null) =>
      days === null
        ? 'Último backup: nunca'
        : `Último backup: ${days === 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`}`,
    imported: (added: number, updated: number) =>
      `Backup importado: ${plural(added, 'registro novo', 'registros novos')}, ${plural(updated, 'atualizado', 'atualizados')}.`,
    importInvalid: 'Esse arquivo não é um backup do Encore.',
    importFailed: 'Não foi possível importar o backup. Seus dados não foram alterados.',
    exportFailed: 'Não foi possível criar o backup.',
    importNewer:
      'Esse backup veio de uma versão mais nova do app. Atualize o app e tente de novo.',
  },
  bodyWeight: {
    title: 'Peso corporal',
    weight: 'Peso',
    log: 'Registrar peso',
    logged: 'Peso registrado',
    hint: 'Pese-se de manhã, em jejum: assim os números são comparáveis. O que conta é a média da semana, não o número do dia.',
    latest: 'Atual',
    weekAverage: 'Média 7 dias',
    weekChange: 'Na semana',
    chartTitle: 'Evolução',
    /** Screen-reader summary of the chart. */
    chartSummary: (from: string, to: string, n: number) =>
      `Peso corporal: de ${from} a ${to} em ${plural(n, 'registro', 'registros')}`,
    entries: 'Registros',
    empty: 'Nenhum registro ainda.',
    deleted: 'Registro excluído',
    deleteEntry: (date: string) => `Excluir registro de ${date}`,
  },
  about: {
    title: 'Sobre',
    menuItem: 'Sobre o Encore',
    version: (version: string) => `Versão ${version}`,
    tagline: 'Log de treino de musculação que funciona sem internet.',
    offline:
      'Tudo fica salvo no seu aparelho. Sem sinal na academia, o app continua funcionando normalmente.',
    privacy: 'Nenhum dado sai do aparelho: não há conta, servidor nem rastreamento.',
  },
}

export type Messages = typeof pt
