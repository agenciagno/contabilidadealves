import { Home as HomeIcon } from 'lucide-react';

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-6 rounded-full bg-muted/30 mb-4">
        <HomeIcon className="w-16 h-16 text-muted-foreground/50" />
      </div>
      <h1 className="text-2xl font-semibold text-muted-foreground/70">
        Página Inicial
      </h1>
      <p className="text-sm text-muted-foreground/50 mt-2">
        Selecione uma opção no menu lateral
      </p>
    </div>
  );
};

export default Home;
