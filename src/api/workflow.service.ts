import { CampusWorkflow, WorkflowResolution } from '../types/workflow';
import { ApiResponse } from '../types';

// Mock Data
const MOCK_WORKFLOWS: CampusWorkflow[] = [
  {
    id: 'wf-1',
    campusId: 'campus-1',
    name: { en: 'Project Submission', ta: 'திட்ட சமர்ப்பிப்பு', hi: 'परियोजना जमा' },
    description: { 
      en: 'Procedure for submitting final year projects.', 
      ta: 'இறுதி ஆண்டு திட்டங்களை சமர்ப்பிப்பதற்கான நடைமுறை.', 
      hi: 'अंतिम वर्ष की परियोजनाओं को जमा करने की प्रक्रिया।' 
    },
    tags: ['submit', 'project', 'assignment', 'thesis'],
    primaryObjectId: 'obj-101', // E.g., The AI Lab or HOD Office
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: { en: 'Get Signature', ta: 'கையெழுத்து பெறுங்கள்', hi: 'हस्ताक्षर प्राप्त करें' },
        description: { en: 'Get approval signature from your internal guide.', ta: 'உங்கள் உள் வழிகாட்டியிடம் ஒப்புதல் கையெழுத்து பெறுங்கள்.', hi: 'अपने आंतरिक मार्गदर्शक से अनुमोदन हस्ताक्षर प्राप्त करें।' }
      },
      {
        id: 'step-2',
        order: 2,
        title: { en: 'Submit Document', ta: 'ஆவணத்தை சமர்ப்பிக்கவும்', hi: 'दस्तावेज़ जमा करें' },
        description: { en: 'Submit the physical copy to the department office.', ta: 'துறை அலுவலகத்தில் ஆவணத்தை சமர்ப்பிக்கவும்.', hi: 'विभाग कार्यालय में भौतिक प्रति जमा करें।' },
        associatedObjectId: 'obj-102' // Department Office
      }
    ]
  },
  {
    id: 'wf-2',
    campusId: 'campus-1',
    name: { en: 'ID Card Replacement', ta: 'அடையாள அட்டை மாற்றுதல்', hi: 'पहचान पत्र प्रतिस्थापन' },
    description: { 
      en: 'Process to get a new ID card if lost.', 
      ta: 'தொலைந்தால் புதிய அடையாள அட்டை பெறுவதற்கான செயல்முறை.', 
      hi: 'खो जाने पर नया आईडी कार्ड प्राप्त करने की प्रक्रिया।' 
    },
    tags: ['id card', 'lost', 'replacement', 'student services'],
    primaryObjectId: 'obj-103', // E.g., Student Affairs
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: { en: 'Pay Fee', ta: 'கட்டணம் செலுத்துங்கள்', hi: 'शुल्क का भुगतान करें' },
        description: { en: 'Pay the replacement fee at the cashier.', ta: 'காசாளரிடம் மாற்று கட்டணம் செலுத்துங்கள்.', hi: 'कैशियर के पास प्रतिस्थापन शुल्क का भुगतान करें।' },
        associatedObjectId: 'obj-104'
      },
      {
        id: 'step-2',
        order: 2,
        title: { en: 'Collect Card', ta: 'அட்டையை சேகரிக்கவும்', hi: 'कार्ड लीजिए' },
        description: { en: 'Show receipt and collect new ID card at Helpdesk.', ta: 'ரசீதைக் காட்டி உதவி மையத்தில் புதிய அடையாள அட்டையைப் பெறுங்கள்.', hi: 'रसीद दिखाएं और हेल्पडेस्क पर नया आईडी कार्ड लें।' },
        associatedObjectId: 'obj-103'
      }
    ]
  }
];

export class WorkflowService {
  private workflows = MOCK_WORKFLOWS;

  /**
   * Search workflows by keywords or tags.
   */
  public async searchWorkflows(campusId: string, query: string): Promise<ApiResponse<WorkflowResolution[]>> {
    const q = query.toLowerCase();
    
    const matchedWorkflows = this.workflows.filter(wf => {
      if (wf.campusId !== campusId) return false;
      
      const inTags = wf.tags.some(t => t.toLowerCase().includes(q) || q.includes(t.toLowerCase()));
      const inName = Object.values(wf.name).some(val => typeof val === 'string' && val.toLowerCase().includes(q));
      
      return inTags || inName;
    });

    const resolutions: WorkflowResolution[] = matchedWorkflows.map(wf => {
      const related = new Set<string>();
      if (wf.primaryObjectId) related.add(wf.primaryObjectId);
      wf.steps.forEach(s => {
        if (s.associatedObjectId) related.add(s.associatedObjectId);
      });
      return {
        workflow: wf,
        relatedObjects: Array.from(related)
      };
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: resolutions
    };
  }

  public async getWorkflowById(workflowId: string): Promise<ApiResponse<CampusWorkflow | null>> {
    const wf = this.workflows.find(w => w.id === workflowId);
    if (!wf) return { success: false, timestamp: new Date().toISOString(), data: null, message: 'Workflow not found' };
    return { success: true, timestamp: new Date().toISOString(), data: wf };
  }
}

export const workflowService = new WorkflowService();
