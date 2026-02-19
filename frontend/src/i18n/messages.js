export const messages = {
  en: {
    app: {
      brand: 'footballhubmanager',
      auth: {
        sectionTitle: 'Authentication',
        sectionHint: 'Use this panel to sign in or create your account.',
        welcome: 'Welcome to footballhubmanager',
        accessHint:
          'Login or register on the left panel to access your role-specific experience as admin or player.'
      },
      overview: {
        sectionTitle: 'Product overview',
        sectionHint: 'Core value and capabilities for admins and players.',
        hero: 'Run your pena from invite to final standings in one place.',
        description:
          'footballhubmanager centralizes seasons, memberships, matches, and rankings with clear workflows for admins and players.',
        todayTitle: 'What you can do today',
        todayBody:
          'Create and activate seasons, generate invitation tokens, let players join safely, and monitor standings by selected season.',
        adminTitle: 'Admin workspace',
        adminBody:
          'Manage pena context, seasons, invite tokens and competitive tracking without leaving the same dashboard.',
        playerTitle: 'Player experience',
        playerBody:
          'Join penas with invite tokens, pick your current pena, keep profile and membership updated, and follow fixtures and standings.',
        contextTitle: 'Context-first navigation',
        contextBody:
          'Admin screens require selected managed pena. Player screens require current pena membership. The app always routes to the right setup step.',
        roadmapTitle: 'MVP now, V2 ready',
        roadmapBody:
          'Current scope delivers auth, seasons, invitations, standings, memberships, and read-only match flow, with expansion space for roster and match detail.',
        onboardingChip: 'Fast onboarding',
        onboardingBody:
          'Register as admin to create your competition, or as player to join a pena in seconds with an invite token.'
      },
      sessionIncomplete: 'Session metadata is incomplete. Please logout and login again.'
    },
    auth: {
      titleLogin: 'Sign in to footballhubmanager',
      titleRegister: 'Create your footballhubmanager account',
      panelDescriptionDefault:
        'Manage your pena seasons, call-ups, matches and standings from one panel.',
      panelDescriptionAdminRegister:
        'Create your admin login and your first pena in one step.',
      tabLogin: 'Login',
      tabRegister: 'Register',
      roleAdmin: 'Admin',
      rolePlayer: 'Player',
      submitSignInAdmin: 'Sign in as admin',
      submitSignInPlayer: 'Sign in as player',
      submitCreateAdmin: 'Create admin account',
      submitCreatePlayer: 'Create player account',
      username: 'Username',
      password: 'Password',
      userName: 'Name',
      userSurname1: 'Surname 1',
      userSurname2: 'Surname 2',
      userNationality: 'Nationality',
      adminUsername: 'Admin username',
      adminPenaName: 'Pena name',
      adminRegisterHint:
        'Admin username is for login. Pena name is the club created at registration.',
      adminUsernameHint: 'This username is used to sign in as admin.',
      adminPenaNameHint: 'This is the name of the pena created for your admin account.',
      adminFooter: 'Admins manage seasons, lineups, scoring rules and invite links.',
      playerFooter: 'Players join penas with invite codes and participate in season matches.'
    },
    language: {
      label: 'Language',
      en: 'EN',
      es: 'ES'
    }
  },
  es: {
    app: {
      brand: 'footballhubmanager',
      auth: {
        sectionTitle: 'Autenticación',
        sectionHint: 'Usa este panel para iniciar sesión o crear tu cuenta.',
        welcome: 'Bienvenido a footballhubmanager',
        accessHint:
          'Inicia sesión o regístrate en el panel izquierdo para entrar según tu rol de admin o jugador.'
      },
      overview: {
        sectionTitle: 'Resumen del producto',
        sectionHint: 'Valor principal y capacidades para admins y jugadores.',
        hero: 'Gestiona tu peña desde la invitación hasta la tabla final en un solo lugar.',
        description:
          'footballhubmanager centraliza temporadas, membresías, partidos y clasificaciones con flujos claros para admins y jugadores.',
        todayTitle: 'Lo que puedes hacer hoy',
        todayBody:
          'Crear y activar temporadas, generar tokens de invitación, permitir altas seguras y revisar la clasificación por temporada.',
        adminTitle: 'Espacio de administración',
        adminBody:
          'Gestiona contexto de peña, temporadas, tokens de invitación y seguimiento competitivo desde el mismo panel.',
        playerTitle: 'Experiencia del jugador',
        playerBody:
          'Únete con token, elige tu peña actual, actualiza perfil y membresía, y sigue partidos y clasificaciones.',
        contextTitle: 'Navegación por contexto',
        contextBody:
          'Las pantallas de admin requieren peña seleccionada. Las de jugador requieren membresía activa en la peña actual.',
        roadmapTitle: 'MVP ahora, V2 preparada',
        roadmapBody:
          'El alcance actual cubre auth, temporadas, invitaciones, clasificaciones, membresías y flujo de partidos en lectura, con espacio para ampliar.',
        onboardingChip: 'Onboarding rápido',
        onboardingBody:
          'Regístrate como admin para crear tu competición o como jugador para unirte en segundos con un token.'
      },
      sessionIncomplete:
        'Los metadatos de sesión están incompletos. Cierra sesión y vuelve a iniciar.'
    },
    auth: {
      titleLogin: 'Inicia sesión en footballhubmanager',
      titleRegister: 'Crea tu cuenta de footballhubmanager',
      panelDescriptionDefault:
        'Gestiona temporadas, convocatorias, partidos y clasificaciones de tu peña desde un único panel.',
      panelDescriptionAdminRegister:
        'Crea tu acceso de admin y tu primera peña en un solo paso.',
      tabLogin: 'Entrar',
      tabRegister: 'Registro',
      roleAdmin: 'Admin',
      rolePlayer: 'Jugador',
      submitSignInAdmin: 'Entrar como admin',
      submitSignInPlayer: 'Entrar como jugador',
      submitCreateAdmin: 'Crear cuenta admin',
      submitCreatePlayer: 'Crear cuenta jugador',
      username: 'Usuario',
      password: 'Contraseña',
      userName: 'Nombre',
      userSurname1: 'Primer apellido',
      userSurname2: 'Segundo apellido',
      userNationality: 'Nacionalidad',
      adminUsername: 'Usuario de admin',
      adminPenaName: 'Nombre de la peña',
      adminRegisterHint:
        'El usuario de admin es para iniciar sesión. El nombre de la peña es el club que se crea al registrarte.',
      adminUsernameHint: 'Este usuario se usa para iniciar sesión como admin.',
      adminPenaNameHint: 'Este será el nombre de la peña creada para tu cuenta de admin.',
      adminFooter: 'Los admins gestionan temporadas, alineaciones, reglas de puntuación y enlaces de invitación.',
      playerFooter: 'Los jugadores se unen con códigos de invitación y participan en las temporadas.'
    },
    language: {
      label: 'Idioma',
      en: 'EN',
      es: 'ES'
    }
  }
}

export const SUPPORTED_LANGUAGES = ['en', 'es']
export const FALLBACK_LANGUAGE = 'en'
