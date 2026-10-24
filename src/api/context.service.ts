import { AppContext, ToolContext, UserContext, LocationContext, TemporalContext, EnvironmentalContext } from '../types/context';
import { SupportedLanguage } from '../types/multilingual';

/**
 * Context Management Layer
 * 
 * Manages the explicit, structured context of the application.
 */
export class ContextService {
  private static instance: ContextService;
  
  private userContext: UserContext = {
    userType: 'visitor',
    preferredLanguage: 'en',
    accessibility: {
      requiresWheelchair: false,
      requiresElevator: false,
      avoidStairs: false,
      avoidRamps: false,
      visualImpairment: false,
      hearingImpairment: false,
    },
    travelMode: 'walking',
    navigationPreference: 'shortest',
  };

  private locationContext: LocationContext = {
    campusId: null,
  };

  private environmentalContext: EnvironmentalContext = {
    restrictions: [],
    blockedConnectionIds: [],
    unavailableFloorIds: [],
    closedBuildingIds: [],
  };

  private constructor() {}

  public static getInstance(): ContextService {
    if (!ContextService.instance) {
      ContextService.instance = new ContextService();
    }
    return ContextService.instance;
  }

  // --- State Mutators ---

  public setPreferredLanguage(lang: SupportedLanguage) {
    this.userContext.preferredLanguage = lang;
  }

  public setAccessibility(requiresWheelchair: boolean) {
    this.userContext.accessibility.requiresWheelchair = requiresWheelchair;
    this.userContext.accessibility.avoidStairs = requiresWheelchair;
    this.userContext.accessibility.requiresElevator = requiresWheelchair;
  }

  public setCurrentCampus(campusId: string) {
    this.locationContext.campusId = campusId;
  }

  public blockConnection(connectionId: string) {
    if (!this.environmentalContext.blockedConnectionIds.includes(connectionId)) {
      this.environmentalContext.blockedConnectionIds.push(connectionId);
    }
  }

  public clearBlocks() {
    this.environmentalContext.blockedConnectionIds = [];
  }

  // --- Context Generators ---

  /**
   * Generates the current temporal context based on system time.
   */
  private generateTemporalContext(): TemporalContext {
    const now = new Date();
    const hours = now.getHours();
    
    return {
      isoTimestamp: now.toISOString(),
      localTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      localDate: now.toISOString().split('T')[0],
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      isAfterHours: hours < 8 || hours >= 18,
    };
  }

  /**
   * Returns the full composite AppContext.
   */
  public getAppContext(): AppContext {
    return {
      user: { ...this.userContext },
      location: { ...this.locationContext },
      temporal: this.generateTemporalContext(),
      environment: { ...this.environmentalContext },
    };
  }

  /**
   * Produces the sanitized ToolContext slice specifically for the AI/Tool layer.
   * Strips out PII and unnecessary fields.
   */
  public getToolContext(): ToolContext {
    if (!this.locationContext.campusId) {
      throw new Error("Cannot generate ToolContext: No active campusId.");
    }
    
    const temporal = this.generateTemporalContext();
    
    // Automatically flag routing as accessible if user profile requires wheelchair/avoid stairs
    const isAccessibleUser = 
      this.userContext.accessibility.requiresWheelchair || 
      this.userContext.accessibility.avoidStairs;

    return {
      campusId: this.locationContext.campusId,
      preferredLanguage: this.userContext.preferredLanguage,
      accessibleOnly: isAccessibleUser,
      travelMode: this.userContext.travelMode,
      blockedConnectionIds: [...this.environmentalContext.blockedConnectionIds],
      currentBuildingId: this.locationContext.buildingId,
      currentFloorId: this.locationContext.floorId,
      isAfterHours: temporal.isAfterHours,
      restrictions: [...this.environmentalContext.restrictions],
    };
  }
}

export const contextService = ContextService.getInstance();
