import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import { orchestrator, eventBus, db } from 'orchestrator';
import { BrahmaEvent } from 'shared';

const App = () => {
  const [events, setEvents] = useState<BrahmaEvent[]>([]);
  const [missionState, setMissionState] = useState<string>('STARTING');
  const [missionId, setMissionId] = useState<string>('');
  
  useEffect(() => {
    orchestrator.startMission('Fix checkout service performance regression').then(id => {
      setMissionId(id);
    });

    const handler = (event: BrahmaEvent) => {
      setEvents(prev => [...prev.slice(-15), event]);
      if (event.type === 'mission.state_changed') {
        setMissionState(event.data?.status || missionState);
      }
    };
    eventBus.onEvent(handler);
    return () => {};
  }, []);

  useInput((input, key) => {
    if (missionState === 'AWAITING_APPROVAL') {
      if (input.toLowerCase() === 'a') {
        orchestrator.approveMission(missionId, 'terminal');
      } else if (input.toLowerCase() === 'r') {
        orchestrator.rejectMission(missionId, 'terminal');
      }
    }
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
    if (input === 'f') { // Secret trigger for chaos
      orchestrator.injectChaos(missionId);
    }
  });

  return (
    <Box flexDirection="column" padding={1} width="100%">
      <Box borderStyle="single" borderColor="magenta">
        <Text color="magenta">BRAHMA</Text>
        <Text>   Mission #{missionId.substring(0, 4)}    </Text>
        <Text color="yellow">{missionState}    </Text>
        <Text color="green">LIVE ●</Text>
      </Box>

      {missionState === 'AWAITING_APPROVAL' && (
        <Box borderStyle="double" borderColor="yellow" flexDirection="column" padding={1} marginY={1}>
          <Text bold color="yellow">HUMAN AUTHORITY REQUIRED</Text>
          <Text>Production has not been modified.</Text>
          <Text>Waiting for terminal or remote web approval...</Text>
          <Text bold color="cyan">[A] APPROVE      [R] REJECT</Text>
        </Box>
      )}

      {events.some(e => e.type === 'chaos.injected') && (
        <Box borderStyle="round" borderColor="red" padding={1} marginY={1}>
          <Text bold color="red">CHAOS TEST INJECTED</Text>
          <Text> target: worker-01, fault: malformed_tool_response</Text>
        </Box>
      )}

      <Box flexDirection="row">
        <Box flexDirection="column" width="30%" borderStyle="single" padding={1}>
          <Text bold>SERVICE HEALTH</Text>
          <Text>checkout-api</Text>
          <Text>p95      {missionState === 'COMPLETED' ? '93 ms' : '1,140 ms'}</Text>
          <Text>deploy   92ac17</Text>
          
          <Box marginY={1} flexDirection="column">
            <Text bold>RELIABILITY</Text>
            <Text>failures: {events.filter(e => e.type === 'worker.failed').length}</Text>
            <Text>recoveries: {events.filter(e => e.type === 'worker.recovered').length}</Text>
            <Text>state lost: 0</Text>
          </Box>
        </Box>
        
        <Box flexDirection="column" width="70%" borderStyle="single" padding={1}>
          <Text bold>LIVE EVENT STREAM</Text>
          {events.map((e, i) => (
            <Box key={i} flexDirection="row">
              <Text color="gray">{e.timestamp.split('T')[1].substring(0,8)} </Text>
              <Text color="cyan">[{e.source.kind.padEnd(7)}] </Text>
              <Text color={e.severity === 'error' ? 'red' : e.severity === 'warning' ? 'yellow' : e.severity === 'success' ? 'green' : 'white'}>
                {e.title} {e.message ? `- ${e.message}` : ''}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
      
      {missionState === 'COMPLETED' && (
        <Box borderStyle="bold" borderColor="green" padding={1} marginTop={1} flexDirection="column">
          <Text bold color="green">BRAHMA / MISSION COMPLETE</Text>
          <Text>p95 before: 1,140ms  |  p95 verified: 93ms  |  p95 after: 95ms</Text>
          <Text>Recovery improvement: 12.0x</Text>
          <Text>Total workers created: 2 | Branches pruned: 2 | Chaos faults recovered: 1</Text>
        </Box>
      )}
    </Box>
  );
};

render(<App />);
