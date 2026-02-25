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
      playerFooter: 'Players join penas with invite codes and participate in season matches.',
      errors: {
        invalidCredentials: 'Invalid credentials.',
        usernameExists: 'Username already exists.',
        invalidUserRegistrationData: 'Invalid user registration data.',
        invalidAdminRegistrationData: 'Invalid admin registration data.',
        invalidNationality: 'Invalid nationality.',
        validation: 'Please review the required fields and try again.',
        network: 'Could not reach the server. Check your connection and try again.',
        generic: 'Authentication request failed. Please try again.'
      }
    },
    dashboard: {
      common: {
        loggedAs: 'Logged as',
        refresh: 'Refresh',
        refreshData: 'Refresh data',
        logout: 'Logout',
        errors: {
          network: 'Could not reach the server. Check your connection and try again.',
          forbidden: 'You do not have permission to perform this action.',
          generic: 'Request failed. Please try again.'
        }
      },
      admin: {
        panelTitle: 'Admin Workspace',
        currentPena: 'Current pena',
        referenceSeason: 'Reference season',
        noLinkedPenaInfo:
          'This admin account has no linked pena. In this system, each admin has exactly one pena created at admin registration. Logout and create a new admin account if this is a legacy account.',
        seasonActiveSuffix: ' (Active)',
        tabs: {
          overview: 'Overview',
          seasons: 'Seasons',
          players: 'Players',
          matches: 'Matches',
          standings: 'Standings'
        },
        chips: {
          pena: 'Pena: {name}',
          activeSeason: 'Active season: {season}',
          selectedSeason: 'Selected season: {season}'
        },
        status: {
          noActiveSeason: 'No active season',
          noSeasonSelected: 'No season selected',
          configured: 'Configured',
          missing: 'Missing'
        },
        table: {
          player: 'Player',
          guid: 'GUID',
          played: 'P',
          goals: 'G',
          assists: 'A',
          w: 'W',
          d: 'D',
          l: 'L',
          pts: 'Pts'
        },
        overview: {
          currentPena: 'Current Pena',
          activeSeason: 'Active Season',
          totalSeasons: 'Total Seasons',
          seasonPlayers: 'Season Players',
          inviteTitle: 'Invite Players',
          inviteDescription: 'Generate a one-time join token and share it with players.',
          generateJoinCode: 'Generate Join Code',
          codeLabel: 'Code',
          expiresLabel: 'Expires',
          quickActionsTitle: 'Quick Actions',
          quickActionsDescription: 'Jump directly to a workflow and keep the dashboard focused.',
          manageSeasons: 'Manage Seasons',
          managePlayers: 'Manage Players',
          createMatch: 'Create Match',
          viewStandings: 'View Standings',
          noDetailedMatch: 'No detailed match created in this session yet.',
          lastMatchCreated: 'Last match created: {guid} for {date}.',
          standingsSnapshotTitle: 'Standings Snapshot',
          refreshStandings: 'Refresh standings',
          selectSeasonToLoad: 'Select a season to load standings.',
          noStandingsForSeason: 'No standings available for this season yet.'
        },
        seasons: {
          configTitle: 'Season Configuration',
          noActiveWarning: 'No active season found for today. Create one to start orchestration.',
          startDate: 'Start date',
          endDate: 'End date',
          useAfterLatest: 'Use dates after latest season',
          winPoints: 'Win points',
          drawPoints: 'Draw points',
          lossPoints: 'Loss points',
          importPreviousToggle: 'Import players from previous season',
          importSourceLabel: 'Source season',
          importSourceHelper:
            'Players registered in the source season will be copied into the new season.',
          importSourceEmpty: 'There are no seasons available to import from.',
          createSeason: 'Create Season',
          overlapHint: 'New seasons must not overlap existing date ranges.',
          selectedSeasonConfigTitle: 'Selected Season Configuration',
          selectSeasonHint: 'Select a season to edit its data.',
          saveSelectedSeason: 'Save Selected Season',
          deleteSelectedSeason: 'Delete Selected Season',
          deleteSeasonTitle: 'Delete season',
          deleteSeasonConfirm:
            'Delete season {season}? This may fail if there are dependent records.',
          cancelDeleteSeason: 'Cancel',
          historyTitle: 'Season History',
          noHistory: 'No previous seasons found.',
          historyPoints: 'W:{win} / D:{draw} / L:{loss}',
          selectSeasonAction: 'Use season',
          selectedSeasonAction: 'Selected'
        },
        players: {
          squadTitle: 'Season Squad Management',
          createSeasonFirst: 'Create at least one season to manage season squads.',
          historicalMembersLabel: 'Historical members to add',
          selectedCount: '{count} selected',
          helperSelectSeason: 'Select a season first.',
          helperSome: 'Only historical members not yet registered in this season are listed.',
          helperNone: 'All historical members are already in this season.',
          addSelectedToSeason: 'Add Selected To Season',
          registeredAvailable: 'Registered: {registered} | Available: {available}',
          noPlayersInSeason: 'No players registered in this season yet.',
          actions: 'Actions',
          editSeasonPlayer: 'Edit stats',
          removeFromSeason: 'Remove',
          editSeasonPlayerTitle: 'Edit season player',
          editSeasonPlayerDescription: 'Update stats for {player}.',
          qualityLevel: 'Quality level',
          cancelEditSeasonPlayer: 'Cancel',
          saveSeasonPlayer: 'Save',
          removeSeasonPlayerTitle: 'Remove player from season',
          removeSeasonPlayerConfirm:
            'Remove {player} from selected season? This action can be blocked if the player already has matches.',
          cancelRemoveSeasonPlayer: 'Cancel'
        },
        guest: {
          title: 'Guest Players',
          description: 'Create players without user account for invited or offline members.',
          name: 'Name',
          surname1: 'Surname 1',
          surname2: 'Surname 2',
          nationality: 'Nationality',
          nickname: 'Nickname',
          position: 'Position',
          createGuest: 'Create Guest',
          createAndAdd: 'Create + Add To Season'
        },
        members: {
          title: 'Pena Members',
          description: 'Manage nickname/position and remove memberships as admin.',
          noMembers: 'No members linked to this pena yet.',
          nickname: 'Nickname',
          position: 'Position',
          actions: 'Actions',
          edit: 'Edit',
          remove: 'Remove',
          editTitle: 'Edit membership',
          editDescription: 'Update membership data for {player}.',
          cancelEdit: 'Cancel',
          saveEdit: 'Save',
          removeTitle: 'Remove membership',
          removeConfirm: 'Remove {player} from this pena?',
          cancelRemove: 'Cancel'
        },
        matches: {
          title: 'Create Match + Lineups',
          description: 'Create a detailed season match and start the lineup process in one action.',
          seasonMatchesTitle: 'Season Matches',
          seasonMatchesDescription:
            'Results are derived from player stats. Manage lineups and stats from one editor.',
          noMatchesYet: 'No matches created for this season yet.',
          saveResult: 'Save Result',
          date: 'Date',
          home: 'Home',
          away: 'Away',
          status: 'Status',
          statusOpen: 'Open',
          statusClosed: 'Closed',
          actions: 'Actions',
          result: 'Result',
          resultSource: 'Update source',
          finalScore: 'Final score',
          scoreFromStats: 'Set score from team/player stats.',
          manageStats: 'Manage stats',
          manageMatch: 'Manage match',
          deleteMatch: 'Delete',
          deleteMatchTitle: 'Delete match',
          cancelDelete: 'Cancel',
          deleteMatchConfirm:
            'Delete match {home} vs {away} ({date})? This action cannot be undone.',
          statsEditorTitle: 'Match stats: {home} vs {away}',
          statsEditorDescription:
            'Update player stats to close the match and recalculate standings.',
          lineupsReopenHint:
            'Updating lineups on a closed match reopens it and removes its current standings impact.',
          teamStats: 'Team stats: {team}',
          goals: 'Goals',
          assists: 'Assists',
          saves: 'Saves',
          rating: 'Rating',
          saveStats: 'Save stats',
          saveLineups: 'Save lineups',
          closeEditor: 'Close editor',
          matchDate: 'Match date',
          homeTeam: 'Home team name',
          awayTeam: 'Away team name',
          homeTeamPlaceholder: 'e.g. Team A',
          awayTeamPlaceholder: 'e.g. Team B',
          homeLineup: 'Home lineup',
          awayLineup: 'Away lineup',
          lineupGuidsHelper: 'Comma or line-break separated player GUIDs',
          availablePlayers: 'Available players',
          lineupBoardHint:
            'Drag players between lists. On touch devices you can also use quick action buttons.',
          lineupEmpty: 'No players in this list.',
          addToHome: 'Add home',
          addToAway: 'Add away',
          moveToHome: 'To home',
          moveToAway: 'To away',
          removeFromLineup: 'Remove',
          createDetailedMatch: 'Create Detailed Match',
          matchCreated: 'Match {guid} created for {date}.',
          lineupHelperTitle: 'Lineup Helper',
          lineupHelperDescription:
            'Select players from the selected season roster to compose lineups.',
          lineupHelperSelectSeason: 'Select a season to display roster players.',
          noPlayersAvailable: 'No players available in the selected season.'
        },
        standings: {
          title: 'Season Standings',
          showingDataFor: 'Showing data for: {season}',
          selectSeasonHeader: 'Select a season in the header to load standings.',
          noSeasonPlayers: 'No season players registered yet.'
        },
        notices: {
          seasonCreated: 'Season created',
          seasonCreatedWithImported: 'Season created and {count} players imported',
          seasonUpdated: 'Season updated',
          seasonDeleted: 'Season deleted',
          detailedMatchCreated: 'Detailed match created',
          matchDeleted: 'Match deleted',
          matchResultUpdated: 'Match result updated',
          matchStatsUpdated: 'Match stats updated',
          lineupsUpdated: 'Lineups updated',
          joinCodeGenerated: 'Join code generated',
          guestCreatedAdded: 'Guest created and added to selected season',
          guestCreated: 'Guest player created',
          playersAdded: '{count} player{suffix} added to season',
          seasonPlayerUpdated: 'Season player updated',
          seasonPlayerRemoved: 'Player removed from season',
          membershipUpdatedByAdmin: 'Membership updated',
          membershipRemovedByAdmin: 'Membership removed',
          standingsUpdated: 'Standings updated'
        },
        errors: {
          lineupsRequired: 'Home and away lineups must include at least one player',
          lineupsOverlap: 'The same player cannot be in both lineups',
          invalidMatchResult: 'Home and away scores must be numbers greater than or equal to zero',
          invalidMatchStats:
            'Goals/assists/saves must be integers greater than or equal to zero, and rating must be zero or higher',
          invalidSeasonRange: 'Season start date must be before or equal to end date',
          invalidSeasonPoints: 'Season points must be integers greater than or equal to zero',
          invalidSeasonPlayerStats:
            'Wins/draws/losses must be integers >= 0 and quality level must be >= 0',
          selectedSeasonRequired:
            'Select a season to complete this action'
        }
      },
      user: {
        panelTitle: 'Player Panel',
        loadingTitle: 'Player Panel',
        profileTitle: 'My Profile',
        saveProfile: 'Save profile',
        joinTitle: 'Join a Pena',
        inviteCode: 'Invite code',
        invitePlaceholder: 'Paste invite token',
        nicknameOptional: 'Nickname (optional)',
        positionOptional: 'Position (optional)',
        join: 'Join',
        myPenasTitle: 'My Penas',
        linkedCount: 'You are linked to {count} pena{suffix}.',
        selectedPena: 'Selected pena',
        noPenasLinked: 'No penas linked yet',
        membershipIn: 'Membership in {name}',
        nickname: 'Nickname',
        position: 'Position',
        role: 'Role: {role}',
        saveMembership: 'Save membership',
        leavePena: 'Leave pena',
        leaveHint: 'Leaving removes your membership link, but historical season stats remain.',
        playerGuid: 'Player GUID: {guid}',
        confirmLeave:
          'Leaving will remove your current membership from this pena. Season stats already recorded will remain in history. Continue?',
        errorInviteRequired: 'Invite code is required',
        noticeProfileUpdated: 'Profile updated',
        noticeJoinedPena: 'Joined pena successfully',
        noticeMembershipUpdated: 'Membership updated',
        noticeLeftPena: 'You left the selected pena',
        fields: {
          name: 'Name',
          surname1: 'Surname 1',
          surname2: 'Surname 2',
          nationality: 'Nationality'
        }
      }
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
      playerFooter: 'Los jugadores se unen con códigos de invitación y participan en las temporadas.',
      errors: {
        invalidCredentials: 'Credenciales inválidas.',
        usernameExists: 'Ese usuario ya existe.',
        invalidUserRegistrationData: 'Datos de registro de jugador inválidos.',
        invalidAdminRegistrationData: 'Datos de registro de admin inválidos.',
        invalidNationality: 'Nacionalidad inválida.',
        validation: 'Revisa los campos obligatorios e inténtalo de nuevo.',
        network: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
        generic: 'La solicitud de autenticación falló. Inténtalo de nuevo.'
      }
    },
    dashboard: {
      common: {
        loggedAs: 'Sesión iniciada como',
        refresh: 'Refrescar',
        refreshData: 'Refrescar datos',
        logout: 'Cerrar sesión',
        errors: {
          network: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
          forbidden: 'No tienes permisos para realizar esta acción.',
          generic: 'La solicitud falló. Inténtalo de nuevo.'
        }
      },
      admin: {
        panelTitle: 'Espacio de administración',
        currentPena: 'Peña actual',
        referenceSeason: 'Temporada de referencia',
        noLinkedPenaInfo:
          'Esta cuenta de admin no tiene una peña vinculada. En este sistema, cada admin tiene exactamente una peña creada durante el registro. Cierra sesión y crea un nuevo admin si esta es una cuenta antigua.',
        seasonActiveSuffix: ' (Activa)',
        tabs: {
          overview: 'Resumen',
          seasons: 'Temporadas',
          players: 'Jugadores',
          matches: 'Partidos',
          standings: 'Clasificación'
        },
        chips: {
          pena: 'Peña: {name}',
          activeSeason: 'Temporada activa: {season}',
          selectedSeason: 'Temporada seleccionada: {season}'
        },
        status: {
          noActiveSeason: 'Sin temporada activa',
          noSeasonSelected: 'Sin temporada seleccionada',
          configured: 'Configurada',
          missing: 'Sin configurar'
        },
        table: {
          player: 'Jugador',
          guid: 'GUID',
          played: 'PJ',
          goals: 'G',
          assists: 'A',
          w: 'V',
          d: 'E',
          l: 'D',
          pts: 'Pts'
        },
        overview: {
          currentPena: 'Peña actual',
          activeSeason: 'Temporada activa',
          totalSeasons: 'Temporadas totales',
          seasonPlayers: 'Jugadores de temporada',
          inviteTitle: 'Invitar jugadores',
          inviteDescription: 'Genera un token de acceso de un solo uso y compártelo con jugadores.',
          generateJoinCode: 'Generar código de acceso',
          codeLabel: 'Código',
          expiresLabel: 'Caduca',
          quickActionsTitle: 'Acciones rápidas',
          quickActionsDescription:
            'Salta directamente a un flujo y mantén el panel enfocado.',
          manageSeasons: 'Gestionar temporadas',
          managePlayers: 'Gestionar jugadores',
          createMatch: 'Crear partido',
          viewStandings: 'Ver clasificación',
          noDetailedMatch: 'Aún no se ha creado un partido detallado en esta sesión.',
          lastMatchCreated: 'Último partido creado: {guid} para {date}.',
          standingsSnapshotTitle: 'Resumen de clasificación',
          refreshStandings: 'Actualizar clasificación',
          selectSeasonToLoad: 'Selecciona una temporada para cargar la clasificación.',
          noStandingsForSeason: 'Aún no hay clasificación disponible para esta temporada.'
        },
        seasons: {
          configTitle: 'Configuración de temporada',
          noActiveWarning: 'No hay temporada activa para hoy. Crea una para empezar.',
          startDate: 'Fecha de inicio',
          endDate: 'Fecha de fin',
          useAfterLatest: 'Usar fechas posteriores a la última temporada',
          winPoints: 'Puntos por victoria',
          drawPoints: 'Puntos por empate',
          lossPoints: 'Puntos por derrota',
          importPreviousToggle: 'Importar jugadores desde una temporada anterior',
          importSourceLabel: 'Temporada origen',
          importSourceHelper:
            'Los jugadores registrados en la temporada origen se copiarán a la nueva temporada.',
          importSourceEmpty: 'No hay temporadas disponibles para importar jugadores.',
          createSeason: 'Crear temporada',
          overlapHint: 'Las nuevas temporadas no pueden solaparse con rangos existentes.',
          selectedSeasonConfigTitle: 'Configuración de la temporada seleccionada',
          selectSeasonHint: 'Selecciona una temporada para editar sus datos.',
          saveSelectedSeason: 'Guardar temporada seleccionada',
          deleteSelectedSeason: 'Eliminar temporada seleccionada',
          deleteSeasonTitle: 'Eliminar temporada',
          deleteSeasonConfirm:
            '¿Eliminar la temporada {season}? Esta acción puede fallar si hay datos dependientes.',
          cancelDeleteSeason: 'Cancelar',
          historyTitle: 'Histórico de temporadas',
          noHistory: 'No se encontraron temporadas anteriores.',
          historyPoints: 'V:{win} / E:{draw} / D:{loss}',
          selectSeasonAction: 'Usar temporada',
          selectedSeasonAction: 'Seleccionada'
        },
        players: {
          squadTitle: 'Gestión de plantilla por temporada',
          createSeasonFirst: 'Crea al menos una temporada para gestionar plantillas.',
          historicalMembersLabel: 'Miembros históricos para añadir',
          selectedCount: '{count} seleccionados',
          helperSelectSeason: 'Primero selecciona una temporada.',
          helperSome:
            'Solo se listan miembros históricos que todavía no están registrados en esta temporada.',
          helperNone: 'Todos los miembros históricos ya están en esta temporada.',
          addSelectedToSeason: 'Añadir seleccionados a la temporada',
          registeredAvailable: 'Registrados: {registered} | Disponibles: {available}',
          noPlayersInSeason: 'Aún no hay jugadores registrados en esta temporada.',
          actions: 'Acciones',
          editSeasonPlayer: 'Editar stats',
          removeFromSeason: 'Quitar',
          editSeasonPlayerTitle: 'Editar jugador de temporada',
          editSeasonPlayerDescription: 'Actualiza estadísticas de {player}.',
          qualityLevel: 'Nivel de calidad',
          cancelEditSeasonPlayer: 'Cancelar',
          saveSeasonPlayer: 'Guardar',
          removeSeasonPlayerTitle: 'Quitar jugador de temporada',
          removeSeasonPlayerConfirm:
            '¿Quitar a {player} de la temporada seleccionada? Esta acción puede bloquearse si ya tiene partidos.',
          cancelRemoveSeasonPlayer: 'Cancelar'
        },
        guest: {
          title: 'Jugadores invitados',
          description: 'Crea jugadores sin cuenta para miembros invitados o presenciales.',
          name: 'Nombre',
          surname1: 'Primer apellido',
          surname2: 'Segundo apellido',
          nationality: 'Nacionalidad',
          nickname: 'Apodo',
          position: 'Posición',
          createGuest: 'Crear invitado',
          createAndAdd: 'Crear + añadir a temporada'
        },
        members: {
          title: 'Miembros de la peña',
          description: 'Gestiona apodo/posición y elimina membresías como admin.',
          noMembers: 'Todavía no hay miembros vinculados a esta peña.',
          nickname: 'Apodo',
          position: 'Posición',
          actions: 'Acciones',
          edit: 'Editar',
          remove: 'Eliminar',
          editTitle: 'Editar membresía',
          editDescription: 'Actualiza los datos de membresía de {player}.',
          cancelEdit: 'Cancelar',
          saveEdit: 'Guardar',
          removeTitle: 'Eliminar membresía',
          removeConfirm: '¿Eliminar a {player} de esta peña?',
          cancelRemove: 'Cancelar'
        },
        matches: {
          title: 'Crear partido + alineaciones',
          description: 'Crea un partido detallado y lanza el flujo de alineaciones en una acción.',
          seasonMatchesTitle: 'Partidos de temporada',
          seasonMatchesDescription:
            'El resultado se calcula desde estadísticas de jugadores. Gestiona convocatoria y estadísticas en un mismo editor.',
          noMatchesYet: 'Todavía no hay partidos creados para esta temporada.',
          saveResult: 'Guardar resultado',
          date: 'Fecha',
          home: 'Local',
          away: 'Visitante',
          status: 'Estado',
          statusOpen: 'Abierto',
          statusClosed: 'Cerrado',
          actions: 'Acciones',
          result: 'Resultado',
          resultSource: 'Origen de actualización',
          finalScore: 'Marcador final',
          scoreFromStats: 'Define el marcador desde estadísticas de equipo/jugadores.',
          manageStats: 'Editar estadísticas',
          manageMatch: 'Gestionar partido',
          deleteMatch: 'Eliminar',
          deleteMatchTitle: 'Eliminar partido',
          cancelDelete: 'Cancelar',
          deleteMatchConfirm:
            '¿Eliminar el partido {home} vs {away} ({date})? Esta acción no se puede deshacer.',
          statsEditorTitle: 'Estadísticas: {home} vs {away}',
          statsEditorDescription:
            'Actualiza estadísticas por jugador para cerrar el partido y recalcular la clasificación.',
          lineupsReopenHint:
            'Actualizar convocatorias en un partido cerrado lo reabre y elimina su impacto actual en la clasificación.',
          teamStats: 'Datos del equipo: {team}',
          goals: 'Goles',
          assists: 'Asistencias',
          saves: 'Paradas',
          rating: 'Valoración',
          saveStats: 'Guardar estadísticas',
          saveLineups: 'Guardar convocatorias',
          closeEditor: 'Cerrar editor',
          matchDate: 'Fecha del partido',
          homeTeam: 'Nombre del local',
          awayTeam: 'Nombre del visitante',
          homeTeamPlaceholder: 'p. ej. Equipo A',
          awayTeamPlaceholder: 'p. ej. Equipo B',
          homeLineup: 'Alineación local',
          awayLineup: 'Alineación visitante',
          lineupGuidsHelper: 'Separa GUIDs por comas o saltos de línea',
          availablePlayers: 'Jugadores disponibles',
          lineupBoardHint:
            'Arrastra jugadores entre listas. En móvil también puedes usar los botones rápidos.',
          lineupEmpty: 'No hay jugadores en esta lista.',
          addToHome: 'Añadir local',
          addToAway: 'Añadir visitante',
          moveToHome: 'Mover a local',
          moveToAway: 'Mover a visitante',
          removeFromLineup: 'Quitar',
          createDetailedMatch: 'Crear partido detallado',
          matchCreated: 'Partido {guid} creado para {date}.',
          lineupHelperTitle: 'Asistente de alineación',
          lineupHelperDescription:
            'Selecciona jugadores de la plantilla de la temporada seleccionada para componer alineaciones.',
          lineupHelperSelectSeason: 'Selecciona una temporada para mostrar jugadores de plantilla.',
          noPlayersAvailable: 'No hay jugadores disponibles en la temporada seleccionada.'
        },
        standings: {
          title: 'Clasificación de temporada',
          showingDataFor: 'Mostrando datos para: {season}',
          selectSeasonHeader: 'Selecciona una temporada en la cabecera para cargar la clasificación.',
          noSeasonPlayers: 'Aún no hay jugadores de temporada registrados.'
        },
        notices: {
          seasonCreated: 'Temporada creada',
          seasonCreatedWithImported: 'Temporada creada y {count} jugadores importados',
          seasonUpdated: 'Temporada actualizada',
          seasonDeleted: 'Temporada eliminada',
          detailedMatchCreated: 'Partido detallado creado',
          matchDeleted: 'Partido eliminado',
          matchResultUpdated: 'Resultado del partido actualizado',
          matchStatsUpdated: 'Estadísticas del partido actualizadas',
          lineupsUpdated: 'Convocatorias actualizadas',
          joinCodeGenerated: 'Código de acceso generado',
          guestCreatedAdded: 'Invitado creado y añadido a la temporada seleccionada',
          guestCreated: 'Jugador invitado creado',
          playersAdded: '{count} jugador{suffix} añadido a la temporada',
          seasonPlayerUpdated: 'Jugador de temporada actualizado',
          seasonPlayerRemoved: 'Jugador quitado de la temporada',
          membershipUpdatedByAdmin: 'Membresía actualizada',
          membershipRemovedByAdmin: 'Membresía eliminada',
          standingsUpdated: 'Clasificación actualizada'
        },
        errors: {
          lineupsRequired:
            'La alineación local y visitante debe incluir al menos un jugador',
          lineupsOverlap:
            'Un mismo jugador no puede estar en las dos convocatorias',
          invalidMatchResult:
            'El marcador local y visitante debe ser un número mayor o igual a cero',
          invalidMatchStats:
            'Goles/asistencias/paradas deben ser enteros mayores o iguales a cero y la valoración debe ser cero o superior',
          invalidSeasonRange:
            'La fecha de inicio de temporada debe ser anterior o igual a la fecha de fin',
          invalidSeasonPoints:
            'Los puntos de temporada deben ser enteros mayores o iguales a cero',
          invalidSeasonPlayerStats:
            'Victorias/empates/derrotas deben ser enteros >= 0 y el nivel de calidad debe ser >= 0',
          selectedSeasonRequired:
            'Selecciona una temporada para completar esta acción'
        }
      },
      user: {
        panelTitle: 'Panel de jugador',
        loadingTitle: 'Panel de jugador',
        profileTitle: 'Mi perfil',
        saveProfile: 'Guardar perfil',
        joinTitle: 'Unirme a una peña',
        inviteCode: 'Código de invitación',
        invitePlaceholder: 'Pega el token de invitación',
        nicknameOptional: 'Apodo (opcional)',
        positionOptional: 'Posición (opcional)',
        join: 'Unirme',
        myPenasTitle: 'Mis peñas',
        linkedCount: 'Estás vinculado a {count} peña{suffix}.',
        selectedPena: 'Peña seleccionada',
        noPenasLinked: 'Todavía no tienes peñas vinculadas',
        membershipIn: 'Membresía en {name}',
        nickname: 'Apodo',
        position: 'Posición',
        role: 'Rol: {role}',
        saveMembership: 'Guardar membresía',
        leavePena: 'Salir de la peña',
        leaveHint: 'Salir elimina tu vínculo de membresía, pero las estadísticas históricas se conservan.',
        playerGuid: 'GUID del jugador: {guid}',
        confirmLeave:
          'Salir eliminará tu membresía actual en esta peña. Las estadísticas históricas ya registradas se conservarán. ¿Continuar?',
        errorInviteRequired: 'El código de invitación es obligatorio',
        noticeProfileUpdated: 'Perfil actualizado',
        noticeJoinedPena: 'Te uniste a la peña correctamente',
        noticeMembershipUpdated: 'Membresía actualizada',
        noticeLeftPena: 'Has salido de la peña seleccionada',
        fields: {
          name: 'Nombre',
          surname1: 'Primer apellido',
          surname2: 'Segundo apellido',
          nationality: 'Nacionalidad'
        }
      }
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
