import { useEffect, useMemo, useState } from 'react';
import {
  type IMatch,
  type IMatchOmitId,
  type ICreatePayload,
  type ITeamName,
  type ITeamScore,
  type ITeamPlayer,
  Auth,
  Match,
} from '@/lib/firebase';
import { Provider, atom, useAtom, useSetAtom } from 'jotai';
import { create } from 'zustand';
import { produce } from 'immer';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Nullable } from '@/utils/types';
import { type User } from 'firebase/auth';
import { Link, useSearchParams } from 'react-router-dom';
import { IcHome } from '@/components/icons/ic-home';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Backdrop } from '@/components/ui/backdrop';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import get from 'lodash/get';
import capitalize from 'lodash/capitalize';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/utils/cn';
import { IcMinus } from '@/components/icons/ic-minus';
import { IcPlus } from '@/components/icons/ic-plus';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { IcCopy } from '@/components/ui/ic-copy';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import toast from 'react-hot-toast';
import { Separator } from '@/components/ui/separator';
import { IcPen } from '@/components/icons/ic-pen';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { IcMenu } from '@/components/icons/ic-menu';

const useAuth = create<{
  user: Nullable<User>;
  setUser: (user: Nullable<User>) => void;
  status: 'loading' | 'authorized' | 'unauthorized';
  setStatus: (status: 'authorized' | 'unauthorized') => void;
}>(set => ({
  user: null,
  setUser: user =>
    set(state =>
      produce(state, draft => {
        draft.user = user;
      })
    ),
  status: 'loading',
  setStatus: status =>
    set(state =>
      produce(state, draft => {
        draft.status = status;
      })
    ),
}));

export default function Page() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const status = useAuth(state => state.status);
  const copy = useCopyToClipboard();
  return (
    <Provider>
      {status !== 'loading' && (
        <div className="container h-full flex flex-col">
          <header className="flex justify-between items-center pt-2 pb-0">
            <img src="/favicon.svg" alt="app-icon" className="size-5" />
            <div className="flex gap-2">
              {/* <UserInfo />
              <AuthButton /> */}
              <MenuSheet />
            </div>
          </header>
          <nav className="px-1 py-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Button asChild>
                    <Link to="/">
                      <IcHome />
                    </Link>
                  </Button>
                </BreadcrumbItem>
                {id && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Match {id}</BreadcrumbPage>
                      <button
                        onClick={() =>
                          copy(id).then(() => toast.success('Copied', { id: 'copied' }))
                        }
                      >
                        <IcCopy />
                      </button>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </nav>
          {status === 'authorized' && (
            <section className="hide-scrollbar min-h-0 flex-1 overflow-auto">
              {!id ? <Dashboard /> : <MatchBoard id={id} />}
            </section>
          )}
          {status === 'unauthorized' && (
            <p className="font-bold text-xl text-center m-10">Login to continue</p>
          )}
        </div>
      )}
      <AuthObserver />
    </Provider>
  );
}

const auth = new Auth();

function AuthObserver() {
  const setStatus = useAuth(state => state.setStatus);
  const setUser = useAuth(state => state.setUser);
  useEffect(() => {
    return auth.onStateChanged(user => {
      setStatus(!user ? 'unauthorized' : 'authorized');
      setUser(user);
    });
  }, [setStatus, setUser]);
  return null;
}

function MenuSheet() {
  const user = useAuth(state => state.user);

  const username = useMemo(() => {
    if (!user) return 'Guest';
    const email = user.email;
    if (!email) return `User ${user.uid}`;
    return capitalize(get(email.split('@'), 0));
  }, [user]);

  return (
    <Sheet>
      <SheetTrigger className="h-8 w-8 inline-flex items-center rounded-md justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2">
        <IcMenu />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            Welcome <i>{username}</i>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">{!user ? <LoginForm /> : <LogoutButton />}</div>
      </SheetContent>
    </Sheet>
  );
}

function LogoutButton() {
  const [, setParams] = useSearchParams();
  async function logout() {
    await auth.logout();
    setParams();
  }
  return (
    <Button className="w-full text-destructive" onClick={logout} variant="secondary">
      Logout
    </Button>
  );
}

function LoginForm() {
  const [error, setError] = useState('');
  const schema = z.object({
    email: z
      .string()
      .trim()
      .min(1)
      .email()
      .transform(val => val.toLowerCase()),
    password: z.string().trim().min(6).max(32),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'auto@xyz.abc', password: '$UKnOk#(vDA@MVR2Qr)ceuWoEO*u$(oq' },
  });

  const onSubmit = form.handleSubmit(async payload => {
    try {
      await auth.login(payload.email, payload.password);
    } catch {
      setError('Something went wrong!');
    }
  });

  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <div className="space-y-2">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input autoComplete="email" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </div>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <div className="space-y-2">
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input {...field} type="password" disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </div>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Login
        </Button>
        <p className="text-destructive">{error}</p>
      </form>
    </Form>
  );
}

const match = new Match();

const isPendingAtom = atom(false);

function Dashboard() {
  return (
    <div className="space-y-10 my-4">
      <Separator />
      <NewMatchForm />
      <Separator />
      <FindMatchForm />
    </div>
  );
}

function NewMatchForm() {
  const [, setSearchParams] = useSearchParams();
  const setPending = useSetAtom(isPendingAtom);

  const form = useForm<ICreatePayload>({
    resolver: zodResolver(
      z.object({
        team_name_a: z.string().trim().min(1).max(50),
        team_name_b: z.string().trim().min(1).max(50),
        team_players_a_st: z.string().trim().min(1).max(50),
        team_players_a_nd: z.string().trim().min(1).max(50),
        team_players_b_st: z.string().trim().min(1).max(50),
        team_players_b_nd: z.string().trim().min(1).max(50),
      })
    ),
    defaultValues: {
      team_name_a: 'Nha-Danh',
      team_name_b: 'Vinh-Kiet',
      team_players_a_st: 'Nha Nguyen',
      team_players_a_nd: 'Danh Nguyen',
      team_players_b_st: 'Vinh Bui',
      team_players_b_nd: 'Kiet Doan',
    },
  });

  const onSubmit = form.handleSubmit(async payload => {
    setPending(true);
    try {
      const id = await match.create(payload).then(snapshot => snapshot.id);
      setSearchParams({ id });
    } catch {
      toast.error('Something went wrong', { id: '500' });
    } finally {
      setPending(false);
    }
  });

  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button className="w-full">New match</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardDescription>Team A</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="team_name_a"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="team_players_a_st"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <FormLabel>Player st</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="team_players_a_nd"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <FormLabel>Player nd</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-4">
                <CardDescription>Team B</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="team_name_b"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="team_players_b_st"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <FormLabel>Player st</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="team_players_b_nd"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <FormLabel>Player nd</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  )}
                />
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                Create
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </form>
    </Form>
  );
}

function FindMatchForm() {
  const [, setSearchParams] = useSearchParams();
  const [value, setValue] = useState('');
  const [isPending, setPending] = useAtom(isPendingAtom);
  async function findMatch() {
    setPending(true);
    try {
      const result = await match.get(value);
      if (!result) toast.error('Not found', { id: '404' });
      else setSearchParams({ id: result.id });
    } catch {
      toast.error('Something went wrong', { id: '500' });
    } finally {
      setPending(false);
    }
  }
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button className="w-full">Existing match</Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 flex gap-2">
        <div className="flex-1 pl-1">
          <Input
            className="w-full"
            placeholder="Enter match ID"
            disabled={isPending}
            value={value}
            onChange={event => setValue(event.target.value)}
          />
        </div>
        <div>
          <Button disabled={isPending || !value} onClick={findMatch}>
            Find
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function MatchBoard({ id }: { id: string }) {
  const [data, setData] = useState<Nullable<IMatch>>(null);
  useEffect(() => {
    return match.onListener(id, setData);
  }, [id]);
  const [tab, setTab] = useState<'st' | 'nd' | 'rd'>('st');
  if (!data) return null;
  const props = { data, id };
  return (
    <Tabs
      value={tab}
      onValueChange={newValue => {
        if (newValue === 'st' || newValue === 'nd' || newValue === 'rd') setTab(newValue);
      }}
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="st">1st</TabsTrigger>
        <TabsTrigger value="nd">2nd</TabsTrigger>
        <TabsTrigger value="rd">3rd</TabsTrigger>
      </TabsList>
      <MatchBoardContent {...props} set="st" />
      <MatchBoardContent {...props} set="nd" />
      <MatchBoardContent {...props} set="rd" />
    </Tabs>
  );
}

function MatchBoardContent({
  data,
  id,
  set,
}: {
  data: IMatch;
  id: string;
  set: keyof IMatchOmitId;
}) {
  const { mutate: updateScore, isPending: isPendingUpdateScore } = useMutation({
    mutationFn: (args: [keyof ITeamScore, number]) => match.updateScore(id, set, ...args),
    throwOnError: false,
  });
  const [isPendingPlayer, setPendingPlayer] = useState(false);
  async function updateServe(team: keyof ITeamPlayer, pos: keyof ITeamPlayer[keyof ITeamPlayer]) {
    setPendingPlayer(true);
    try {
      await match.updatePlayerServe(id, set, team, pos);
    } finally {
      setPendingPlayer(false);
    }
  }
  async function updateSwap(team: keyof ITeamPlayer) {
    setPendingPlayer(true);
    try {
      await match.updateSwapPlayer(id, set, team);
    } finally {
      setPendingPlayer(false);
    }
  }
  const isPending = isPendingUpdateScore || isPendingPlayer;
  return (
    <TabsContent value={set} className="grid grid-cols-2 gap-1 mt-0">
      <Backdrop open={isPending} />
      <Card className="mt-2">
        <div>
          <DialogNameForm id={id} data={data} set={set} team="a" />
          <p className="text-center text-5xl font-bold">{data[set].team_score.a}</p>
          <DialogPlayerNameForm id={id} data={data} set={set} team="a" />
        </div>
      </Card>
      <Card className="mt-2">
        <div>
          <DialogNameForm id={id} data={data} set={set} team="b" />
          <p className="text-center text-5xl font-bold">{data[set].team_score.b}</p>
          <DialogPlayerNameForm id={id} data={data} set={set} team="b" />
        </div>
      </Card>
      <Drawer>
        <DrawerTrigger className="mt-2 col-span-2 inline-flex items-center justify-center h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium">
          <IcPen className="mr-2" />
          Update
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      disabled={isPending || data[set].team_score.a === 0}
                      onClick={() => updateScore(['a', -1])}
                    >
                      <IcMinus />
                    </Button>
                    <div className="flex-1">
                      <p className="font-bold text-center text-4xl">{data[set].team_score.a}</p>
                    </div>
                    <Button size="icon" disabled={isPending} onClick={() => updateScore(['a', 1])}>
                      <IcPlus />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-1 items-center justify-end">
                      <Label
                        htmlFor="player-a-st-name"
                        className="text-xl overflow-hidden whitespace-nowrap text-ellipsis"
                      >
                        {data[set].team_players.a.st.name}
                      </Label>
                      <Checkbox
                        className="size-5"
                        id="player-a-st-name"
                        checked={data[set].team_players.a.st.serve}
                        disabled={isPending}
                        onCheckedChange={checked =>
                          checked !== 'indeterminate' && checked && updateServe('a', 'st')
                        }
                      />
                    </div>
                    <div className="flex gap-1 items-center justify-end">
                      <Label
                        htmlFor="player-a-nd-name"
                        className="text-xl overflow-hidden whitespace-nowrap text-ellipsis"
                      >
                        {data[set].team_players.a.nd.name}
                      </Label>
                      <Checkbox
                        className="size-5"
                        id="player-a-nd-name"
                        checked={data[set].team_players.a.nd.serve}
                        disabled={isPending}
                        onCheckedChange={checked =>
                          checked !== 'indeterminate' && checked && updateServe('a', 'nd')
                        }
                      />
                    </div>
                    <Button className="w-full" disabled={isPending} onClick={() => updateSwap('a')}>
                      Swap
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      disabled={isPending || data[set].team_score.b === 0}
                      onClick={() => updateScore(['b', -1])}
                    >
                      <IcMinus />
                    </Button>
                    <div className="flex-1">
                      <p className="font-bold text-center text-4xl">{data[set].team_score.b}</p>
                    </div>
                    <Button size="icon" disabled={isPending} onClick={() => updateScore(['b', 1])}>
                      <IcPlus />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-1 items-center justify-start">
                      <Checkbox
                        className="size-5"
                        id="player-b-st-name"
                        checked={data[set].team_players.b.st.serve}
                        disabled={isPending}
                        onCheckedChange={checked =>
                          checked !== 'indeterminate' && checked && updateServe('b', 'st')
                        }
                      />
                      <Label
                        htmlFor="player-b-st-name"
                        className="text-xl overflow-hidden whitespace-nowrap text-ellipsis"
                      >
                        {data[set].team_players.b.st.name}
                      </Label>
                    </div>
                    <div className="flex gap-1 items-center justify-start">
                      <Checkbox
                        className="size-5"
                        id="player-b-1-name"
                        checked={data[set].team_players.b.nd.serve}
                        disabled={isPending}
                        onCheckedChange={checked =>
                          checked !== 'indeterminate' && checked && updateServe('b', 'nd')
                        }
                      />
                      <Label
                        htmlFor="player-b-1-name"
                        className="text-xl overflow-hidden whitespace-nowrap text-ellipsis"
                      >
                        {data[set].team_players.b.nd.name}
                      </Label>
                    </div>
                    <Button className="w-full" disabled={isPending} onClick={() => updateSwap('b')}>
                      Swap
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </TabsContent>
  );
}

function DialogNameForm({
  id,
  data,
  set,
  team,
}: {
  id: string;
  data: IMatch;
  set: keyof IMatchOmitId;
  team: keyof ITeamName;
}) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger className="w-full px-1">
        <p className="text-xl whitespace-nowrap overflow-hidden text-ellipsis">
          {data[set].team_name[team]}
        </p>
      </DialogTrigger>
      <DialogContent>
        <NameForm
          id={id}
          set={set}
          team={team}
          name={data[set].team_name[team]}
          onSubmitted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  id,
  set,
  team,
  name,
  onSubmitted,
}: {
  id: string;
  set: keyof IMatchOmitId;
  team: keyof ITeamName;
  name: string;
  onSubmitted: VoidFunction;
}) {
  const schema = z.object({ name: z.string().min(1).max(50) });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name },
  });
  const onSubmit = form.handleSubmit(async payload => {
    await match.updateTeamName(id, set, team, payload.name);
    form.reset(payload);
    onSubmitted();
  });

  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <div className="space-y-1">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Update
        </Button>
      </form>
    </Form>
  );
}

function DialogPlayerNameForm({
  id,
  data,
  set,
  team,
}: {
  id: string;
  data: IMatch;
  set: keyof IMatchOmitId;
  team: keyof ITeamPlayer;
}) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="px-2">
          <div
            className={cn(
              'flex items-center gap-2 justify-end',
              team === 'b' && 'flex-row-reverse'
            )}
          >
            <p className="whitespace-nowrap overflow-hidden text-ellipsis text-lg">
              {data[set].team_players[team].st.name}
            </p>
            <div>
              <div
                className={cn(
                  'size-4 rounded-full',
                  data[set].team_players[team].st.serve && 'bg-green-500'
                )}
              />
            </div>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 justify-end',
              team === 'b' && 'flex-row-reverse'
            )}
          >
            <p className="whitespace-nowrap overflow-hidden text-ellipsis text-lg">
              {data[set].team_players[team].nd.name}
            </p>
            <div>
              <div
                className={cn(
                  'size-4 rounded-full',
                  data[set].team_players[team].nd.serve && 'bg-green-500'
                )}
              />
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <PlayerNameForm
          id={id}
          set={set}
          team={team}
          st={data[set].team_players[team].st.name}
          nd={data[set].team_players[team].nd.name}
          onSubmitted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function PlayerNameForm({
  id,
  set,
  team,
  st,
  nd,
  onSubmitted,
}: {
  id: string;
  set: keyof IMatchOmitId;
  team: keyof ITeamPlayer;
  st: string;
  nd: string;
  onSubmitted: VoidFunction;
}) {
  const schema = z.object({ st: z.string().min(1).max(50), nd: z.string().min(1).max(50) });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { st, nd },
  });
  const onSubmit = form.handleSubmit(async payload => {
    await match.updatePlayerName(id, set, team, payload.st, payload.nd);
    form.reset(payload);
    onSubmitted();
  });

  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="st"
            render={({ field }) => (
              <div className="space-y-1">
                <FormLabel>Name player 1</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="nd"
            render={({ field }) => (
              <div className="space-y-1">
                <FormLabel>Name player 2</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Update
        </Button>
      </form>
    </Form>
  );
}
